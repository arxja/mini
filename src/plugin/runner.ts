import type { Middleware } from '../http/types.js'
import type { App } from '../http/app.js'
import type { FileRoute } from '../router/files.js'
import type { Manifest } from '../build/manifest.js'
import type { ResolvedConfig } from './types.js'

export async function runConfigResolved(config: ResolvedConfig): Promise<void> {
  for (const plugin of config.plugins) {
    await plugin.configResolved?.(config)
  }
}

export function collectMiddleware(config: ResolvedConfig, app: App): Middleware[] {
  const out: Middleware[] = []
  for (const plugin of config.plugins) {
    const result = plugin.middleware?.({ app, config })
    if (!result) continue
    if (Array.isArray(result)) out.push(...result)
    else out.push(result)
  }
  return out
}

export function transformRoutes(routes: FileRoute[], config: ResolvedConfig): FileRoute[] {
  let current = routes
  for (const plugin of config.plugins) {
    if (!plugin.onRoute) continue
    const next: FileRoute[] = []
    for (const r of current) {
      const result = plugin.onRoute(r, config)
      if (result === null) continue
      next.push(result ?? r)
    }
    current = next
  }
  return current
}

export async function runBuildEnd(
  config: ResolvedConfig,
  manifest: Manifest,
  outDir: string,
): Promise<void> {
  for (const plugin of config.plugins) {
    await plugin.buildEnd?.({ manifest, outDir, config })
  }
}
