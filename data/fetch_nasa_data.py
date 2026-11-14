"""Snapshot the NASA data HALO uses, so the app works fully offline.

Sources
- NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), via api.nasa.gov:
  solar energetic particle events (SEP), solar flares (FLR), coronal mass ejections (CME), geomagnetic storms (GST).
- NASA Open Science Data Repository (OSDR), study OSD-569 (SpaceX Inspiration4):
  LSDS-7 Complete Blood Count (CBC).

Usage:  python data/fetch_nasa_data.py [--api-key KEY]
Writes: app/public/data/donki_snapshot.json, app/public/data/i4_cbc.json  (+ raw copies in data/nasa-raw/)
DEMO_KEY works but is rate-limited; get a free key at https://api.nasa.gov.
"""

import argparse
import csv
import datetime as dt
import io
import json
import pathlib
import statistics
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "nasa-raw"
OUT = ROOT / "app" / "public" / "data"

DONKI = "https://api.nasa.gov/DONKI/{kind}?startDate={start}&endDate={end}&api_key={key}"
OSDR_CBC = (
    "https://osdr.nasa.gov/geode-py/ws/studies/OSD-569/download?source=datamanager"
    "&file=LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv"
)


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "halo-space-apps-prototype"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def donki(kind: str, start: dt.date, end: dt.date, key: str) -> list:
    body = get(DONKI.format(kind=kind, start=start, end=end, key=key)).decode()
    return json.loads(body) if body.strip() else []


def slim(kind: str, e: dict) -> dict:
    """Keep only what the app shows."""
    if kind == "SEP":
        t = e.get("eventTime")
        return {"type": "SEP", "time": t, "id": e.get("sepID"), "instruments": [i["displayName"] for i in e.get("instruments") or []], "link": e.get("link")}
    if kind == "FLR":
        return {"type": "FLR", "time": e.get("peakTime") or e.get("beginTime"), "id": e.get("flrID"), "classType": e.get("classType"), "link": e.get("link")}
    if kind == "CME":
        an = next((a for a in (e.get("cmeAnalyses") or []) if a.get("isMostAccurate")), None) or (e.get("cmeAnalyses") or [None])[0]
        return {"type": "CME", "time": e.get("startTime"), "id": e.get("activityID"), "speed": an.get("speed") if an else None, "link": e.get("link")}
    if kind == "GST":
        kp = max((k.get("kpIndex") or 0 for k in e.get("allKpIndex") or []), default=None)
        return {"type": "GST", "time": e.get("startTime"), "id": e.get("gstID"), "kp": kp, "link": e.get("link")}
    raise ValueError(kind)


def window(start: dt.date, end: dt.date, key: str, missing: list) -> list:
    """Fetch each event type separately; a failure (rate limit, outage) is recorded, not fatal."""
    events = []
    for kind in ("SEP", "FLR", "CME", "GST"):
        try:
            events += [slim(kind, e) for e in donki(kind, start, end, key)]
        except Exception as ex:  # noqa: BLE001 - keep partial data
            missing.append(f"{kind} {start}..{end}: {ex}")
        time.sleep(1.0)
    return sorted(events, key=lambda e: e["time"] or "")


def fetch_donki(key: str, today: dt.date) -> dict:
    recent_start = today - dt.timedelta(days=59)  # DONKI caps a request at 60 days
    missing: list = []
    snap = {
        "source": "NASA DONKI (CCMC) via api.nasa.gov",
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "recent": {"start": str(recent_start), "end": str(today), "events": window(recent_start, today, key, missing)},
        # A well-documented real storm, used as a demo scenario.
        "scenarios": {
            "may2024": {
                "label": "May 2024 solar storm (Gannon storm)",
                "start": "2024-05-08",
                "end": "2024-05-22",
                "events": window(dt.date(2024, 5, 8), dt.date(2024, 5, 22), key, missing),
            }
        },
    }
    snap["missing"] = missing
    return snap


def fetch_cbc() -> dict:
    raw = get(OSDR_CBC)
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / "OSD-569_LSDS-7_CBC_TRANSFORMED.csv").write_bytes(raw)
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    return {"source": "NASA OSDR OSD-569 (Inspiration4), LSDS-7 Complete Blood Count", "columns": list(rows[0].keys()) if rows else [], "rows": rows}


TIMEPOINTS = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"]  # days before launch / after return
CBC_METRICS = {
    "lymphocytes": ("absolute_lymphocytes_value_cells_per_microliter", "cells/µL"),
    "neutrophils": ("absolute_neutrophils_value_cells_per_microliter", "cells/µL"),
    "wbc": ("white_blood_cell_count_value_thousand_per_microliter", "×10³/µL"),
    "platelets": ("platelet_count_value_thousand_per_microliter", "×10³/µL"),
}


def summarize_cbc(cbc: dict) -> dict:
    """Per-crew series + crew mean for a few immune-relevant CBC values."""
    series: dict = {k: {} for k in CBC_METRICS}
    notes = []
    for r in cbc["rows"]:
        name = r["Sample Name"]  # e.g. C001_whole-blood_R+1_cbc
        crew, _, tp, _ = name.split("_")
        for key, (col, unit) in CBC_METRICS.items():
            try:
                v = float(r[col])
            except (KeyError, ValueError):
                continue
            if unit == "cells/µL" and v < 100:  # recorded in thousands by mistake (e.g. 10.1 -> 10100)
                notes.append(f"{name} {key}: {v} interpreted as {v * 1000:.0f} cells/µL")
                v *= 1000
            series[key].setdefault(crew, {})[tp] = v
    out = {}
    for key, (_, unit) in CBC_METRICS.items():
        crews = series[key]
        mean = []
        for tp in TIMEPOINTS:
            vals = [c[tp] for c in crews.values() if tp in c]
            mean.append(round(statistics.mean(vals), 2) if vals else None)
        out[key] = {"unit": unit, "crew": {c: [v.get(tp) for tp in TIMEPOINTS] for c, v in sorted(crews.items())}, "mean": mean}
    return {
        "source": cbc["source"],
        "study": "OSD-569",
        "url": "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
        "timepoints": TIMEPOINTS,
        "metrics": out,
        "notes": notes,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-key", default="DEMO_KEY")
    ap.add_argument("--today", default=str(dt.date.today()))
    ap.add_argument("--only", choices=["donki", "cbc"], help="fetch just one source")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    if a.only != "cbc":
        fetch_and_write_donki(a)
    if a.only != "donki":
        cbc = fetch_cbc()
        summary = summarize_cbc(cbc)
        (OUT / "i4_cbc.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"OSDR CBC: {len(cbc['rows'])} rows -> i4_cbc.json; notes: {summary['notes']}")


def fetch_and_write_donki(a) -> None:
    snap = fetch_donki(a.api_key, dt.date.fromisoformat(a.today))
    (OUT / "donki_snapshot.json").write_text(json.dumps(snap, indent=1), encoding="utf-8")
    n = len(snap["recent"]["events"])
    m = len(snap["scenarios"]["may2024"]["events"])
    print(f"DONKI: {n} recent events, {m} in May 2024 scenario; missing: {snap['missing'] or 'none'}")


if __name__ == "__main__":
    main()
