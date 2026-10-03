import { describe, it, expect } from 'vitest'
import { compose, type Middleware, type NextFn } from '../src/http/compose.js'
//                                                                 ^^^ .js, even though the file is compose.ts

// ---------- Test fixtures ----------

type TestCtx = { log: string[] }

const makeCtx = (): TestCtx => ({ log: [] })

/**
 * Middleware that logs `name` on the way IN, runs `next`, then logs
 * `name-out` on the way OUT. This is the "onion" shape.
 */
const mw =
  (name: string): Middleware<TestCtx> =>
  async (ctx, next) => {
    ctx.log.push(`${name}-in`)
    await next()
    ctx.log.push(`${name}-out`)
  }

/**
 * A "terminal" middleware: logs on entry and does NOT call next.
 * This is what a route handler looks like in our framework.
 */
const handler =
  (name: string): Middleware<TestCtx> =>
  async (ctx) => {
    ctx.log.push(name)
  }

// ---------- Tests ----------

describe('compose', () => {
  // ────────────────────────────────────────────────────────────
  // Test 1 — middlewares run in registration order.
  // ────────────────────────────────────────────────────────────
  it('runs middlewares in registration order', async () => {
    const ctx = makeCtx()
    const run = compose<TestCtx>([
      // Explicit types here: inline arrow functions inside an array literal
      // don't always get contextual inference from the generic parameter.
      // Real-world rule: when inference fails, annotate. Don't fight it.
      async (c: TestCtx, next: NextFn) => {
        c.log.push('a')
        await next()
      },
      async (c: TestCtx, next: NextFn) => {
        c.log.push('b')
        await next()
      },
      handler('h'),
    ])

    await run(ctx)

    expect(ctx.log).toEqual(['a', 'b', 'h'])
  })

  // ────────────────────────────────────────────────────────────
  // Test 2 — the onion: post-work runs in reverse.
  // ────────────────────────────────────────────────────────────
  it('runs post-work in reverse order', async () => {
    const ctx = makeCtx()
    const run = compose<TestCtx>([mw('a'), mw('b'), handler('h')])

    await run(ctx)

    expect(ctx.log).toEqual(['a-in', 'b-in', 'h', 'b-out', 'a-out'])
  })

  // ────────────────────────────────────────────────────────────
  // Test 3 — double next() throws.
  // ────────────────────────────────────────────────────────────
  it('throws when next() is called twice', async () => {
    const ctx = makeCtx()
    const doubleNext: Middleware<TestCtx> = async (_c, next) => {
      await next()
      await next() // ← illegal
    }
    const run = compose<TestCtx>([doubleNext])

    await expect(run(ctx)).rejects.toThrow(/multiple times/)
  })

  // ────────────────────────────────────────────────────────────
  // Test 4 — errors propagate out when nobody catches.
  // ────────────────────────────────────────────────────────────
  it('propagates errors when no middleware catches them', async () => {
    const ctx = makeCtx()
    const boom: Middleware<TestCtx> = async () => {
      throw new Error('boom')
    }
    const run = compose<TestCtx>([
      async (c: TestCtx, next: NextFn) => {
        c.log.push('a')
        await next()
      },
      boom,
    ])

    await expect(run(ctx)).rejects.toThrow('boom')
    expect(ctx.log).toEqual(['a'])
  })

  // ────────────────────────────────────────────────────────────
  // Test 5 — upstream middleware catches downstream errors.
  // ────────────────────────────────────────────────────────────
  it('lets upstream middleware catch downstream errors', async () => {
    const ctx = makeCtx()
    let caught: unknown = null

    const catcher: Middleware<TestCtx> = async (c, next) => {
      try {
        await next()
      } catch (err) {
        caught = err
        c.log.push('caught')
      }
    }

    const boom: Middleware<TestCtx> = async () => {
      throw new Error('boom')
    }

    const run = compose<TestCtx>([catcher, boom])

    await run(ctx)

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe('boom')
    expect(ctx.log).toEqual(['caught'])
  })
})
