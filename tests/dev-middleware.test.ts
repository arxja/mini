import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { createApp } from '../src/http/app.js'
import { devMiddleware } from '../src/dev/middleware.js'
import { createBundleCache } from '../src/dev/cache.js'
import { makeCtx } from './helpers.js'

const routesDir = join(import.meta.dirname, 'fixtures/routes')

describe('devMiddleware', () => {
  it('returns 400 when ?page is missing', async () => {
    const app = createApp()
    app.use(devMiddleware({ routesDir, cache: createBundleCache() }))
    const { ctx, res } = makeCtx('GET', '/_mini/client.js')
    await app.handle(ctx)
    expect(res.statusCode).toBe(400)
  })

  it('returns 403 for paths outside routesDir', async () => {
    const app = createApp()
    app.use(devMiddleware({ routesDir, cache: createBundleCache() }))
    const { ctx, res } = makeCtx(
      'GET',
      '/_mini/client.js?page=' + encodeURIComponent('/etc/passwd'),
    )
    await app.handle(ctx)
    expect(res.statusCode).toBe(403)
  })

  it('rejects prefix-confusion paths (app-evil vs app)', async () => {
    const app = createApp()
    app.use(devMiddleware({ routesDir, cache: createBundleCache() }))
    const evil = routesDir + '-evil/x.tsx'
    const { ctx, res } = makeCtx('GET', '/_mini/client.js?page=' + encodeURIComponent(evil))
    await app.handle(ctx)
    expect(res.statusCode).toBe(403)
  })

  it('passes through non-/_mini/ paths', async () => {
    const app = createApp()
    let reached = false
    app.use(devMiddleware({ routesDir, cache: createBundleCache() }))
    app.use((_c, next) => {
      reached = true
      return next()
    })
    app.get('/ok', (ctx) => {
      ctx.res.end('ok')
    })
    const { ctx } = makeCtx('GET', '/ok')
    await app.handle(ctx)
    expect(reached).toBe(true)
  })

  it('bundles a real page', async () => {
    const app = createApp()
    app.use(devMiddleware({ routesDir, cache: createBundleCache() }))
    const page = join(routesDir, 'page.tsx')
    const { ctx, res } = makeCtx('GET', '/_mini/client.js?page=' + encodeURIComponent(page))
    await app.handle(ctx)
    expect(res.statusCode).toBe(200)
    expect(res.headers.get('content-type')).toContain('javascript')
    expect(res.body).toContain('__MINI_PAYLOAD__')
  }, 30000)
})
