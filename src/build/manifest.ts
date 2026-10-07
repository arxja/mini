import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface Manifest {
  pages: Record<string, string>
}

export async function readManifest(outDir: string): Promise<Manifest> {
  const raw = await readFile(join(outDir, 'manifest.json'), 'utf8')
  return JSON.parse(raw) as Manifest
}
