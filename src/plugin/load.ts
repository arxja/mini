import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { MiniConfig, Mode, ResolvedConfig, UserConfig } from './types.js'

const CANDIDATES = ['mini.config.ts', 'mini.config.mjs', 'mini.config.js']

export async function loadConfigFile(cwd: string, mode: Mode): Promise<MiniConfig | null> {
  for (const name of CANDIDATES) {
    const abs = resolve(cwd, name)
    if (!existsSync(abs)) continue

    const url = pathToFileURL(abs).href + `?v=${Date.now()}`
    const mod = (await import(url)) as { default?: UserConfig }
    if (!mod.default) {
      throw new Error(`[mini] ${name} has no default export`)
    }
    const raw = typeof mod.default === 'function' ? await mod.default({ mode }) : mod.default
    return raw
  }
  return null
}

export function resolveConfig(raw: MiniConfig | null, mode: Mode, cwd: string): ResolvedConfig {
  return {
    mode,
    root: cwd,
    routesDir: resolve(cwd, raw?.routesDir ?? './app'),
    outDir: resolve(cwd, raw?.outDir ?? './dist'),
    port: raw?.port ?? 3000,
    plugins: raw?.plugins ?? [],
  }
}
