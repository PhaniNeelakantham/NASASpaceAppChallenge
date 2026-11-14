import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Serves POST /api/assistant during `npm run dev` using the same file Vercel deploys (api/assistant.ts),
 * so the Claude API key stays server-side locally too.
 */
function devAssistantApi(): Plugin {
  return {
    name: 'halo-dev-assistant-api',
    configureServer(server) {
      server.middlewares.use('/api/assistant', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let raw = ''
        for await (const chunk of req) raw += chunk
        const env = loadEnv('development', process.cwd(), '')
        const mod = await server.ssrLoadModule('/api/assistant.ts')
        let body: unknown = null
        try {
          body = JSON.parse(raw || 'null')
        } catch {
          body = null
        }
        const r = await mod.handleAssistant(body, env.CLAUDE_API_KEY, env.CLAUDE_MODEL)
        res.statusCode = r.status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(r.body))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devAssistantApi()],
})
