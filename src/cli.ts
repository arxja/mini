#!/usr/bin/env node
import { createApp } from './http/app.js'

const [, , command, ...args] = process.argv

const commands: Record<string, (args: string[]) => Promise<void> | void> = {
  async dev(args) {
    const routesDir = args[0] ?? './app'
    const app = createApp()

    app.use(async (_ctx, next) => {
      const t0 = Date.now()
      await next()
      console.log(`[mini] handled in ${Date.now() - t0}ms`)
    })

    await app.routes(routesDir)

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
  console.error(`Usage: mini <dev|build|start> [routes-dir]`)
  process.exit(1)
}
await run(args)
