import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createApp } from '../src/http/app.js'
import { serveStatic } from '../src/http/static.js'
import { makeCtx } from './helpers.js'

describe('serveStatic', () => {
  it('serves a file and sets content-type', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mini-static-'))
    try {
      await writeFile(join(dir, 'a.js'), 'console.log(1)')
      const app = createApp()
      app.use(serveStatic({ dir, prefix: '/assets/' }))
      const { ctx, res } = makeCtx('GET', '/assets/a.js')
      await app.handle(ctx)
      expect(res.statusCode).toBe(200)
      expect(res.headers.get('content-type')).toContain('javascript')
      expect(res.body).toBe('console.log(1)')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('404s missing files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mini-static-'))
    try {
      const app = createApp()
      app.use(serveStatic({ dir, prefix: '/assets/' }))
      const { ctx, res } = makeCtx('GET', '/assets/missing.js')
      await app.handle(ctx)
      expect(res.statusCode).toBe(404)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('does not serve files outside its directory', async () => {
    const app = createApp()
    app.use(serveStatic({ dir: '/tmp', prefix: '/assets/' }))
    const { ctx, res } = makeCtx('GET', '/assets/../../etc/passwd')
    await app.handle(ctx)

    // URL parsing normalizes '..' before the middleware sees it. So the
    // path becomes /etc/passwd, which doesn't match /assets/ and falls
    // through to the router -> 404. If URL parsing ever changes, the
    // middleware's normalize+includes('..') guard catches it -> 403.
    // Both are secure outcomes. What matters is the file isn't served.
    expect([403, 404]).toContain(res.statusCode)
    expect(res.body).not.toContain('root:')
  })

  it('403s a raw traversal path that bypasses URL normalization', async () => {
    const app = createApp()
    app.use(serveStatic({ dir: '/tmp', prefix: '/assets/' }))
    const { ctx, res } = makeCtx('GET', '/assets/x')
    // Directly overwrite path — simulates a client/proxy that hands us
    // a non-normalized path. This is the case the guard exists for.
    ;(ctx as { path: string }).path = '/assets/../etc/passwd'
    await app.handle(ctx)
    expect(res.statusCode).toBe(403)
  })
})
