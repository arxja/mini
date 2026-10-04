import { describe, it, expect } from 'vitest'
import { createApp } from '../src/http/app.js'
import type { Middleware } from '../src/http/types.js'
import { makeCtx } from './helpers.js'

describe('router — params', () => {
  it('captures a single param', async () => {
    const app = createApp()
    let seen: string | undefined
    app.get('/users/:id', (ctx) => {
      seen = ctx.params.id
      ctx.res.end()
    })

    await app.handle(makeCtx('GET', '/users/42').ctx)
    expect(seen).toBe('42')
  })

  it('captures multiple params', async () => {
    const app = createApp()
    let seen: Record<string, string> = {}
    app.get('/users/:userId/posts/:postId', (ctx) => {
      seen = { ...ctx.params }
      ctx.res.end()
    })

    await app.handle(makeCtx('GET', '/users/7/posts/99').ctx)
    expect(seen).toEqual({ userId: '7', postId: '99' })
  })

  it('static beats param when both match', async () => {
    const app = createApp()
    const log: string[] = []
    // Register param FIRST, static SECOND — order must not matter.
    app.get('/users/:id', (ctx) => {
      log.push('param')
      ctx.res.end()
    })
    app.get('/users/me', (ctx) => {
      log.push('static')
      ctx.res.end()
    })

    await app.handle(makeCtx('GET', '/users/me').ctx)
    expect(log).toEqual(['static'])
  })

  it('params do not leak between requests', async () => {
    const app = createApp()
    app.get('/a/:x', (ctx) => {
      ctx.res.end(ctx.params.x ?? '')
    })

    const r1 = makeCtx('GET', '/a/one')
    await app.handle(r1.ctx)
    expect(r1.res.body).toBe('one')

    const r2 = makeCtx('GET', '/a/two')
    await app.handle(r2.ctx)
    expect(r2.res.body).toBe('two')

    // r1's params object must still read 'one' — not be mutated by r2.
    expect(r1.ctx.params.x).toBe('one')
  })

  it('empty params object on static routes', async () => {
    const app = createApp()
    let seen: Record<string, string> = {}
    app.get('/plain', (ctx) => {
      seen = { ...ctx.params }
      ctx.res.end()
    })

    await app.handle(makeCtx('GET', '/plain').ctx)
    expect(seen).toEqual({})
  })
})

describe('router — per-route middleware', () => {
  it('runs per-route middleware before the handler', async () => {
    const app = createApp()
    const log: string[] = []

    const auth: Middleware = async (_c, next) => {
      log.push('auth')
      await next()
    }
    const logMw: Middleware = async (_c, next) => {
      log.push('log')
      await next()
    }

    app.get('/admin', auth, logMw, (ctx) => {
      log.push('handler')
      ctx.res.end()
    })

    await app.handle(makeCtx('GET', '/admin').ctx)
    expect(log).toEqual(['auth', 'log', 'handler'])
  })

  it('global middleware runs before per-route middleware', async () => {
    const app = createApp()
    const log: string[] = []

    app.use(async (_c, next) => {
      log.push('global')
      await next()
    })
    app.get(
      '/x',
      async (_c, next) => {
        log.push('per-route')
        await next()
      },
      (ctx) => {
        log.push('handler')
        ctx.res.end()
      },
    )

    await app.handle(makeCtx('GET', '/x').ctx)
    expect(log).toEqual(['global', 'per-route', 'handler'])
  })

  it('per-route middleware can short-circuit', async () => {
    const app = createApp()
    let handlerRan = false

    const block: Middleware = async (ctx) => {
      ctx.res.statusCode = 403
      ctx.res.end('forbidden')
    }
    app.get('/secret', block, (ctx) => {
      handlerRan = true
      ctx.res.end('ok')
    })

    const { ctx, res } = makeCtx('GET', '/secret')
    await app.handle(ctx)
    expect(res.statusCode).toBe(403)
    expect(handlerRan).toBe(false)
  })

  it('per-route middleware can read params', async () => {
    const app = createApp()
    let seenId: string | undefined

    const reader: Middleware = async (c, next) => {
      seenId = c.params.id
      await next()
    }
    app.get('/u/:id', reader, (ctx) => {
      ctx.res.end()
    })

    await app.handle(makeCtx('GET', '/u/abc').ctx)
    expect(seenId).toBe('abc')
  })
})
