import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { watchDir } from '../src/dev/watcher.js'

describe('watchDir', () => {
  const dirs: string[] = []

  afterEach(async () => {
    for (const d of dirs) await rm(d, { recursive: true, force: true })
    dirs.length = 0
  })

  it('fires on file changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mini-watch-'))
    dirs.push(dir)

    const events: string[] = []
    const watcher = watchDir(dir, (f) => events.push(f), 20)

    await writeFile(join(dir, 'a.ts'), 'hello')
    await new Promise((r) => setTimeout(r, 200))

    expect(events.length).toBeGreaterThan(0)
    watcher.close()
  }, 5000)
})
