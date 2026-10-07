#!/usr/bin/env node
import { join, resolve } from 'node:path'
import { createApp } from './http/app.js'
import { devMiddleware } from './dev/middleware.js'
import { createBundleCache } from './dev/cache.js'
import { watchDir } from './dev/watcher.js'
import { broadcast } from './dev/events.js'
import { build as buildProject } from './build/build.js'
import { readManifest } from './build/manifest.js'
import { serveStatic } from './http/static.js'
import { loadFileRoutes } from './router/files.js'
import {
  loadConfigFile,
  resolveConfig,
  runConfigResolved,
  collectMiddleware,
  transformRoutes,
  runBuildEnd,
} from './plugin/index.js'
import type { Mode, ResolvedConfig } from './plugin/types.js'

const [, , command, ...args] = process.argv

async function prepare(mode: Mode, args: string[]): Promise<ResolvedConfig> {
  const cwd = process.cwd()
  const raw = await loadConfigFile(cwd, mode)
  const config = resolveConfig(raw, mode, cwd)
  // CLI arg overrides config file.
  if (args[0]) config.routesDir = resolve(cwd, args[0])
  await runConfigResolved(config)
  return config
}

async function registerRoutes(
  app: ReturnType<typeof createApp>,
  config: ResolvedConfig,
  opts?: Parameters<typeof loadFileRoutes>[1],
): Promise<void> {
  const routes = await loadFileRoutes(config.routesDir, opts)
  const transformed = transformRoutes(routes, config)
  for (const r of transformed) {
    app.addRoute({ method: r.method, pattern: r.pattern, handler: r.handler })
  }
  console.log(`[mini] loaded ${transformed.length} route(s)`)
}

const commands: Record<string, (args: string[]) => Promise<void> | void> = {
  async dev(args) {
    const config = await prepare('dev', args)
    const cache = createBundleCache()
    const app = createApp()

    for (const mw of collectMiddleware(config, app)) app.use(mw)
    app.use(devMiddleware({ routesDir: config.routesDir, cache }))

    await registerRoutes(app, config)

    const watcher = watchDir(config.routesDir, async (file) => {
      console.log(`[mini] change: ${file} — hmr`)
      cache.invalidateAll()
      app.clearRoutes?.()
      await registerRoutes(app, config)
      broadcast('hmr')
    })

    const server = app.listen(config.port, () => {
      console.log(`[mini] dev server on http://localhost:${config.port}`)
    })

    const shutdown = (): void => {
      watcher.close()
      server.close(() => process.exit(0))
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  },

  async build(args) {
    const config = await prepare('build', args)
    const manifest = await buildProject({
      routesDir: config.routesDir,
      outDir: config.outDir,
    })
    await runBuildEnd(config, manifest, config.outDir)
  },

  async start(args) {
    const config = await prepare('serve', args)
    const manifest = await readManifest(config.outDir)
    const app = createApp()

    for (const mw of collectMiddleware(config, app)) app.use(mw)
    app.use(serveStatic({ dir: join(config.outDir, 'client'), prefix: '/assets/' }))

    await registerRoutes(app, config, {
      bundleUrl: (pattern) => {
        const file = manifest.pages[pattern]
        if (!file) throw new Error(`[mini] no bundle for "${pattern}" in manifest`)
        return '/assets/' + file
      },
    })

    app.listen(config.port, () => {
      console.log(`[mini] prod server on http://localhost:${config.port}`)
    })
  },
}

const run = commands[command ?? '']
if (!run) {
  console.error(`Unknown command: ${command ?? '(none)'}`)
  console.error(`Usage: mini <dev|build|start> [routes-dir]`)
  process.exit(1)
}
await run(args)
