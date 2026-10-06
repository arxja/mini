#!/usr/bin/env node
import { resolve } from 'node:path'
import { createApp } from './http/app.js'
import { devMiddleware } from './dev/middleware.js'
import { createBundleCache } from './dev/cache.js'
import { watchDir } from './dev/watcher.js'
import { broadcast } from './dev/events.js'

const [, , command, ...args] = process.argv

const commands: Record<string, (args: string[]) => Promise<void> | void> = {
  async dev(args) {
    const routesDir = resolve(args[0] ?? './app')
    const cache = createBundleCache()
    const app = createApp()

    app.use(devMiddleware({ routesDir, cache }))

    app.use(async (_ctx, next) => {
      const t0 = Date.now()
      await next()
      console.log(`[mini] handled in ${Date.now() - t0}ms`)
    })

    await app.routes(routesDir)

    const watcher = watchDir(routesDir, async (file) => {
      console.log(`[mini] change: ${file} — reloading`)
      cache.invalidateAll()
      await app.routes(routesDir)
      broadcast('reload')
    })

    const port = 3000
    const server = app.listen(port, () => {
      console.log(`[mini] dev server on http://localhost:${port}`)
    })

    const shutdown = (): void => {
      watcher.close()
      server.close(() => process.exit(0))
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
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
