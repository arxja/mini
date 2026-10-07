import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { loadFileRoutes } from '../router/files.js'
import { bundleClient } from './client-bundle.js'
import type { Manifest } from './manifest.js'

export interface BuildOptions {
  routesDir: string
  outDir: string
}

export async function build(opts: BuildOptions): Promise<Manifest> {
  const routesDir = resolve(opts.routesDir)
  const outDir = resolve(opts.outDir)
  const clientDir = join(outDir, 'client')

  await rm(outDir, { recursive: true, force: true })
  await mkdir(clientDir, { recursive: true })

  const routes = await loadFileRoutes(routesDir)

  const pages: Record<string, string> = {}
  const built = new Set<string>()

  for (const r of routes) {
    if (!r.sourceFile) continue
    if (built.has(r.pattern)) continue
    built.add(r.pattern)

    const code = await bundleClient({ pageFile: r.sourceFile, mode: 'prod' })
    const filename = `${patternToSlug(r.pattern)}.js`
    await writeFile(join(clientDir, filename), code)
    pages[r.pattern] = filename
    console.log(`[mini] built ${r.pattern} -> client/${filename}`)
  }

  const manifest: Manifest = { pages }
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`[mini] wrote ${outDir}/manifest.json (${Object.keys(pages).length} page(s))`)

  return manifest
}

/** Pure: route pattern -> bundle filename (without .js). */
export function patternToSlug(pattern: string): string {
  if (pattern === '/') return 'index'
  return pattern
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}
