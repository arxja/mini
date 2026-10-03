#!/usr/bin/env node
import { createApp } from './http/app.js'

const [, , command] = process.argv

const commands: Record<string, () => Promise<void> | void> = {
  async dev() {
    const app = createApp()

    // Temporary demo: a logger + one route. Deleted in Phase 2.
    app.use(async (_ctx, next) => {
      const t0 = Date.now()
      await next()
      console.log(`[mini] handled in ${Date.now() - t0}ms`)
    })

    app.get('/hello', (ctx) => {
      ctx.res.setHeader('content-type', 'text/plain')
      ctx.res.end('hello from mini')
    })

    const port = 3000
    app.listen(port, () => {
      console.log(`[mini] dev server on http://localhost:${port}`)
    })
  },

  async build() {
    console.log('[mini] build: not implemented yet')
  },

  async start() {
    console.log('[mini] start: not implemented yet')
  },
}

const run = commands[command ?? '']
if (!run) {
  console.error(`Unknown command: ${command ?? '(none)'}`)
  console.error(`Usage: mini <dev|build|start>`)
  process.exit(1)
}
await run()