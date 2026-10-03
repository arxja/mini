import { describe, it, expect } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../src/http/app.js'
import { createCtx } from '../src/http/context.js'
import type { Ctx } from '../src/http/types.js'

// Minimal fake response. Node's ServerResponse is a WritableStream — too
// much surface for tests. We only need the pieces the framework touches.
class FakeRes {
  statusCode = 200
  headers = new Map<string, string>()
  body = ''
  headersSent = false

  setHeader(k: string, v: string) {
    this.headers.set(k.toLowerCase(), v)
  }
  end(chunk?: string) {
    if (chunk) this.body += chunk
    this.headersSent = true
  }
  destroy() {
    this.headersSent = true
  }
}

function makeCtx(method: string, url: string): { ctx: Ctx; res: FakeRes } {
  const req = { method, url, headers: {} } as unknown as IncomingMessage
  const res = new FakeRes()
  const ctx = createCtx(req, res as unknown as ServerResponse)
  return { ctx, res }
}

describe('app', () => {
  it('runs a registered GET handler', async () => {
    const app = createApp()
    app.get('/hello', (ctx) => {
      ctx.res.end('world')
    })

    const { ctx, res } = makeCtx('GET', '/hello')
    await app.handle(ctx)

    expect(res.body).toBe('world')
    expect(res.statusCode).toBe(200)
  })

  it('returns 404 for unknown path', async () => {
    const app = createApp()
    const { ctx, res } = makeCtx('GET', '/nope')
    await app.handle(ctx)
    expect(res.statusCode).toBe(404)
    expect(res.body).toBe('Not Found')
  })

  it('returns 405 when path exists for a different method', async () => {
    const app = createApp()
    app.get('/only-get', (ctx) => {
      ctx.res.end('ok')
    })

    const { ctx, res } = makeCtx('POST', '/only-get')
    await app.handle(ctx)

    expect(res.statusCode).toBe(405)
    expect(res.headers.get('allow')).toBe('GET')
  })

  it('runs global middleware around the route handler (onion)', async () => {
    const app = createApp()
    const log: string[] = []

    app.use(async (_c, next) => {
      log.push('mw-in')
      await next()
      log.push('mw-out')
    })
    app.get('/x', (ctx) => {
      log.push('handler')
      ctx.res.end()
    })

    const { ctx } = makeCtx('GET', '/x')
    await app.handle(ctx)

    expect(log).toEqual(['mw-in', 'handler', 'mw-out'])
  })

  it('middleware can short-circuit before the router', async () => {
    const app = createApp()
    app.use(async (ctx) => {
      ctx.res.statusCode = 401
      ctx.res.end('nope')
      // no next() — chain stops here
    })
    app.get('/secret', (ctx) => {
      ctx.res.end('secret')
    })

    const { ctx, res } = makeCtx('GET', '/secret')
    await app.handle(ctx)

    expect(res.statusCode).toBe(401)
    expect(res.body).toBe('nope')
  })

  it('parses the query string into ctx.query', async () => {
    const app = createApp()
    let seen: string | null = null
    app.get('/q', (ctx) => {
      seen = ctx.query.get('x')
      ctx.res.end()
    })

    const { ctx } = makeCtx('GET', '/q?x=42')
    await app.handle(ctx)

    expect(seen).toBe('42')
  })
})
