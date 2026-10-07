import type { Middleware } from '../http/types.js'
import type { App } from '../http/app.js'
import type { FileRoute } from '../router/files.js'
import type { Manifest } from '../build/manifest.js'

export type Mode = 'dev' | 'build' | 'serve'

export interface ResolvedConfig {
  mode: Mode
  root: string
  routesDir: string
  outDir: string
  port: number
  plugins: Plugin[]
}

export interface Plugin {
  name: string

  /** Called after config is resolved, before anything else. */
  configResolved?(config: ResolvedConfig): void | Promise<void>

  /** Return middleware to inject globally (runs before the router). */
  middleware?(ctx: { app: App; config: ResolvedConfig }): Middleware | Middleware[] | void

  /** Transform each route at boot. Return null to drop it. */
  onRoute?(route: FileRoute, config: ResolvedConfig): FileRoute | null | void

  /** Called after `mini build` finishes. */
  buildEnd?(ctx: {
    manifest: Manifest
    outDir: string
    config: ResolvedConfig
  }): void | Promise<void>
}

export interface MiniConfig {
  routesDir?: string
  outDir?: string
  port?: number
  plugins?: Plugin[]
}

export type UserConfig = MiniConfig | ((env: { mode: Mode }) => MiniConfig | Promise<MiniConfig>)

/** Identity function for typing. Same pattern as Vite's defineConfig. */
export function defineConfig(config: UserConfig): UserConfig {
  return config
}
