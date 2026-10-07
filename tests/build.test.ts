import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { build, patternToSlug } from '../src/build/build.js'

describe('patternToSlug', () => {
  it('root -> index', () => expect(patternToSlug('/')).toBe('index'))
  it('flat', () => expect(patternToSlug('/about')).toBe('about'))
  it('nested', () => expect(patternToSlug('/users/list')).toBe('users_list'))
  it('param', () => expect(patternToSlug('/users/:id')).toBe('users_id'))
})

describe('build', () => {
  it('produces manifest and client bundles', async () => {
    const out = await mkdtemp(join(tmpdir(), 'mini-build-'))
    try {
      const routesDir = join(import.meta.dirname, 'fixtures/routes')
      const manifest = await build({ routesDir, outDir: out })

      expect(Object.keys(manifest.pages)).toContain('/page')
      const bundleName = manifest.pages['/page']!
      expect(bundleName).toMatch(/^page\.js$/)

      expect(existsSync(join(out, 'manifest.json'))).toBe(true)
      expect(existsSync(join(out, 'client', bundleName))).toBe(true)

      const code = await readFile(join(out, 'client', bundleName), 'utf8')
      expect(code).toContain('__MINI_PAYLOAD__')
      // Prod bundle should not include HMR code.
      expect(code).not.toContain('EventSource')
    } finally {
      await rm(out, { recursive: true, force: true })
    }
  }, 60000)
})
