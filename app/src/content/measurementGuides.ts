import type { MetricId } from '../types'

export interface MeasurementGuide {
  id: string
  title: string
  /** Which app metrics this guide helps you record. */
  metrics: MetricId[]
  tool: string
  duration: string
  /** What is different (or harder) in microgravity. */
  inSpace: string
  steps: string[]
  tips: string[]
  recheckIf: string
}

// DRAFT general-reference content. Content owner: verify against your mission's
// approved procedures before the demo.
export const GUIDES: MeasurementGuide[] = [
  {
    id: 'heart-rate',
    title: 'Resting heart rate',
    metrics: ['heartRate'],
    tool: 'Wrist or chest-strap sensor, a pulse oximeter, or just two fingers',
    duration: '5 minutes of rest, then 1 minute to measure',
    inSpace:
      'There is no "sitting" in microgravity. Secure yourself with a foot restraint or strap so your muscles can relax and your body stays still.',
    steps: [
      'Rest for 5 minutes. Measure before exercise and before caffeine.',
      'Get comfortable and secure, breathe normally, and do not talk.',
      'With a sensor: wear it snug, about a finger-width above the wrist bone, and wait until the number settles.',
      'By hand: place your index and middle fingers (not your thumb) on the inside of your other wrist, just below the base of the thumb, until you feel the pulse.',
      'Count the beats for 30 seconds and multiply by 2. Count a full 60 seconds if the rhythm feels uneven.',
      'Log the number in your daily check-in.',
    ],
    tips: [
      'Measure at the same time every day so readings are comparable.',
      'A reading taken right after moving, eating or a stressful task is not a resting reading.',
    ],
    recheckIf:
      'The number is outside the warning limits, or you feel dizzy, faint, or have chest pain. Rest 5 more minutes and measure again.',
  },
  {
    id: 'blood-pressure',
    title: 'Blood pressure',
    metrics: ['systolic', 'diastolic'],
    tool: 'Automatic upper-arm cuff',
    duration: '5 minutes of rest, then 2 minutes to measure',
    inSpace:
      'Body fluids shift toward the head and there is no up or down. Use restraints to stay still and keep your arm relaxed and supported at about chest height.',
    steps: [
      'Avoid caffeine and exercise for 30 minutes beforehand, then rest quietly for 5 minutes.',
      'Wrap the cuff snugly around your bare upper arm (not over clothing), with the lower edge about 2 cm (1 inch) above the bend of the elbow.',
      'Rest your arm, relaxed and supported, with the cuff at heart level (about mid-chest).',
      'Stay still, do not talk, breathe normally, and press start.',
      'When the cuff finishes, write down both numbers: systolic (top) and diastolic (bottom).',
      'Wait 1 minute and take a second reading. Record both, or use the average.',
    ],
    tips: [
      'Use the same arm every time.',
      'A cuff that is too loose or the wrong size gives false readings. Use the size assigned to you.',
    ],
    recheckIf:
      'A reading is outside the warning limits or you feel dizzy or faint. Rest 5 more minutes and repeat. Two out-of-range readings, chest pain, or fainting means contact the Crew Medical Officer.',
  },
  {
    id: 'spo2',
    title: 'Blood oxygen (SpO₂)',
    metrics: ['spo2'],
    tool: 'Fingertip pulse oximeter',
    duration: '1 to 2 minutes',
    inSpace:
      'Low-pressure atmospheres and spacewalk preparation can lower oxygen in the tissues, and high cabin CO₂ can cause headaches. That is why SpO₂ is watched closely.',
    steps: [
      'Rest quietly for a few minutes.',
      'If your hands are cold, rub them together to warm them. Remove nail polish or artificial nails from the finger you will use.',
      'Clip the oximeter onto your index or middle fingertip, snug but not tight.',
      'Rest your hand, relaxed, at about chest height and keep it still.',
      'Wait about 30 seconds until the number stops jumping, then record the steady reading.',
    ],
    tips: [
      'Cold fingers, movement and a loose clip are the most common causes of bad readings.',
      'If the pulse signal on the device looks weak or erratic, try another finger.',
    ],
    recheckIf:
      'The reading is below the warning limit, or you feel short of breath, get a headache, or feel confused. Re-measure on another finger. If it is still low, or breathing is hard at rest, contact the Crew Medical Officer immediately.',
  },
  {
    id: 'temperature',
    title: 'Body temperature',
    metrics: ['temperature'],
    tool: 'The thermometer assigned to you (oral, ear or forehead type)',
    duration: '1 to 2 minutes',
    inSpace:
      'With no natural convection, warm air does not rise away from your body. Wait until you have fully cooled down after exercise before measuring.',
    steps: [
      'Wait about 30 minutes after exercise and 15 minutes after eating or drinking.',
      'Clean the thermometer with a wipe and let it dry.',
      'Oral: place the tip under your tongue, to one side, with lips closed. Ear: gently pull the ear back and up, then seat the probe snugly. Forehead: aim or sweep exactly as the device instructs, on clean, dry skin.',
      'Hold still until the device beeps, then read the number.',
      'Record the number and the method you used (oral, ear, forehead), because methods read slightly differently.',
    ],
    tips: [
      'Use the same type of thermometer every day.',
      'Remove hats or headbands and let your skin cool for a few minutes before a forehead reading.',
    ],
    recheckIf:
      'The reading is outside the warning limits. Wait 10 minutes and measure again. A fever together with a spreading rash, chills, or feeling unwell means contact the Crew Medical Officer.',
  },
  {
    id: 'glucose',
    title: 'Blood glucose',
    metrics: ['glucose'],
    tool: 'Glucose meter with test strips and a lancet (or a continuous glucose monitor)',
    duration: '2 minutes',
    inSpace:
      'Blood droplets can float in microgravity. Keep a wipe ready, work over a wipe or tray, and use the sharps container for the lancet.',
    steps: [
      'Clean your hands and dry them completely. Sugar or dirt on the skin can falsely raise the reading.',
      'Insert a new test strip into the meter and wait until it says it is ready.',
      'Load a fresh lancet and prick the side of your fingertip (it hurts less than the pad).',
      'Squeeze gently to form one small round drop of blood, then touch the edge of the strip to the drop until the meter beeps.',
      'Read the number and note whether you were fasting or had eaten recently.',
      'Put the used lancet and strip in the sharps or biohazard container and wipe up any blood.',
    ],
    tips: [
      'Never share a lancet or a meter.',
      'A reading soon after a meal is naturally higher than a fasting one, so always note which it was.',
    ],
    recheckIf:
      'The reading is outside the warning limits. Clean your hands and repeat once. If it is low and you feel shaky, sweaty or confused, eat or drink something sugary and contact the Crew Medical Officer.',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    metrics: ['sleepHours'],
    tool: 'Sleep tracker or a simple sleep log',
    duration: '1 minute each morning',
    inSpace:
      'On the space station the sun rises or sets about every 90 minutes, which can disrupt your body clock. A steady routine and a dark sleeping area help.',
    steps: [
      'If you use a tracker, wear it to bed. Note the time the lights went out.',
      'When you wake up for the day, note that time too.',
      'Subtract any time you remember being awake during the night.',
      'Hours slept = time in bed minus time awake. Round to the nearest half hour, or use the tracker\'s "total sleep time".',
      'Log it first thing in the morning, while you still remember.',
    ],
    tips: [
      'Count only actual sleep, not time spent lying awake.',
      'A rough honest estimate is fine. An inflated number is not.',
    ],
    recheckIf:
      'You sleep less than the warning limit, or you are short on sleep for several nights in a row. Tell the Crew Medical Officer if tiredness affects your work or safety.',
  },
  {
    id: 'mood-stress',
    title: 'Mood and stress',
    metrics: ['mood', 'stress'],
    tool: 'The 1 to 10 scales in your daily check-in',
    duration: '1 minute',
    inSpace:
      'Isolation, confinement, workload and distance from family are real stressors on a mission. Tracking them daily helps spot problems early.',
    steps: [
      'Pause for a few breaths and notice how you feel, in your body and in your thoughts.',
      'Mood: pick a number from 1 (very low) to 10 (very good) for the last day, not just this minute.',
      'Stress: pick a number from 1 (calm) to 10 (extremely stressed), thinking about workload, sleep and worries.',
      'Go with your first honest answer. Do not aim for a number that looks good.',
      'If something is driving the number, add a short note or symptom.',
    ],
    tips: [
      'Your own trend matters more than any single day.',
      'There are no right or wrong scores.',
    ],
    recheckIf:
      'Mood stays low or stress stays high for several days, or you feel unable to cope. Talk to the Crew Medical Officer or a flight psychologist. Asking for support is part of the job.',
  },
  {
    id: 'pvt',
    title: 'Reaction test (PVT)',
    metrics: ['pvtLapses'],
    tool: 'The reaction-time (psychomotor vigilance) test on the tablet',
    duration: 'About 3 minutes (check your test\'s length)',
    inSpace:
      'Fatigue, heavy workload and lost sleep slow reaction time, which matters when operating spacecraft. The test gives an objective check beyond how tired you feel.',
    steps: [
      'Find a quiet spot with little distraction and secure yourself so your hand is free.',
      'Take the test at about the same time each day, and note if you have just had caffeine.',
      'Hold the device steady with your finger ready on the response button.',
      'When the signal appears, tap as fast as you can.',
      'Do not tap before the signal. Early taps count as false starts.',
      'Stay with the test until it ends, even if it gets boring, and do not repeat it to get a better score.',
    ],
    tips: [
      'A lapse is a response slower than 0.5 seconds (500 ms). Lapses are the main number this app tracks.',
      'Rest and sleep are the biggest factors, so read your score together with last night\'s sleep.',
    ],
    recheckIf:
      'Lapses are above your usual level or the warning limit. Take extra care with safety-critical tasks until you are rested, and tell the Crew Medical Officer if it keeps happening.',
  },
  {
    id: 'exercise',
    title: 'Exercise minutes',
    metrics: ['exerciseMin'],
    tool: 'Your assigned exercise equipment and a timer or the equipment display',
    duration: 'Log after each session',
    inSpace:
      'Without gravity, bones and muscles weaken quickly, so exercise is a daily countermeasure. Logging it shows whether you are keeping up.',
    steps: [
      'Start a timer when your actual workout begins, after setup and strapping in.',
      'Pause the timer for long rests between sets or for equipment problems.',
      'Stop the timer when you finish. That is the time for this session.',
      'Add up all of today\'s sessions, both aerobic (treadmill or bike) and resistance training.',
      'Enter the total in minutes.',
    ],
    tips: [
      'Count minutes of real exercise, not time spent getting ready or cleaning up.',
      'Log honestly. A missed day is useful information.',
    ],
    recheckIf:
      'You miss several sessions in a row. Stop and contact the Crew Medical Officer if exercise causes chest pain, severe breathlessness or dizziness.',
  },
  {
    id: 'body-mass',
    title: 'Body mass',
    metrics: ['bodyMass'],
    tool: 'Mass measurement device in orbit, or a bathroom scale on Earth',
    duration: '2 minutes',
    inSpace:
      'A normal scale measures weight, and nothing has weight in free fall. Crews measure mass with a device that works out how hard you are to move (mass = force ÷ acceleration), such as the spring-based SLAMMD.',
    steps: [
      'Measure at the same time every day, ideally after waking and using the toilet, before eating or drinking.',
      'Wear minimal, consistent clothing.',
      'Secure yourself to the device as instructed so you cannot drift.',
      'Stay still and relaxed while the device measures.',
      'Wait for the reading to settle and record it to the nearest 0.1 kg.',
    ],
    tips: [
      'Day-to-day swings of a few hundred grams are normal (meals, hydration). Watch the trend over several days.',
      'On Earth: same scale, same flat hard floor, same clothing every time.',
    ],
    recheckIf:
      'Your mass is dropping across several days. Tell the Crew Medical Officer and review food and fluid intake.',
  },
]
