import { describe, it, expect, vi } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createApp } from '../src/http/app.js'
import { makeCtx } from './helpers.js'
import {
  collectMiddleware,
  transformRoutes,
  runConfigResolved,
  runBuildEnd,
} from '../src/plugin/runner.js'
import { loadConfigFile, resolveConfig } from '../src/plugin/load.js'
import type { Plugin, ResolvedConfig } from '../src/plugin/types.js'
import path, { join, resolve } from 'node:path'

const baseConfig = (plugins: Plugin[] = []): ResolvedConfig => ({
  mode: 'dev',
  root: '/tmp',
  routesDir: '/tmp/app',
  outDir: '/tmp/dist',
  port: 0,
  plugins,
})

describe('plugin runner', () => {
  it('runs configResolved in order', async () => {
    const order: string[] = []
    const config = baseConfig([
      { name: 'a', configResolved: () => void order.push('a') },
      { name: 'b', configResolved: () => void order.push('b') },
    ])
    await runConfigResolved(config)
    expect(order).toEqual(['a', 'b'])
  })

  it('collects middleware from plugins', () => {
    const a = vi.fn(async () => {})
    const b = vi.fn(async () => {})
    const config = baseConfig([
      { name: 'a', middleware: () => a },
      { name: 'b', middleware: () => [b] },
      { name: 'c' },
    ])
    const app = createApp()
    const mws = collectMiddleware(config, app)
    expect(mws).toHaveLength(2)
  })

  it('applies plugin middleware to requests', async () => {
    const config = baseConfig([
      {
        name: 'inject',
        middleware: () => async (ctx, next) => {
          ctx.res.setHeader('x-plugin', 'yes')
          await next()
        },
      },
    ])
    const app = createApp()
    for (const mw of collectMiddleware(config, app)) app.use(mw)
    app.get('/x', (ctx) => {
      ctx.res.end('ok')
    })
    const { ctx, res } = makeCtx('GET', '/x')
    await app.handle(ctx)
    expect(res.headers.get('x-plugin')).toBe('yes')
    expect(res.body).toBe('ok')
  })

  it('transforms routes in order and can drop', () => {
    const routes = [
      { pattern: '/a', method: 'GET' as const, handler: () => {} },
      { pattern: '/b', method: 'GET' as const, handler: () => {} },
      { pattern: '/drop', method: 'GET' as const, handler: () => {} },
    ]
    const config = baseConfig([
      {
        name: 'drop',
        onRoute: (r) => (r.pattern === '/drop' ? null : r),
      },
      {
        name: 'rename',
        onRoute: (r) => ({ ...r, pattern: r.pattern + '!' }),
      },
    ])
    const out = transformRoutes(routes, config)
    expect(out.map((r) => r.pattern)).toEqual(['/a!', '/b!'])
  })

  it('runs buildEnd', async () => {
    const fn = vi.fn()
    const config = baseConfig([{ name: 'x', buildEnd: fn }])
    await runBuildEnd(config, { pages: { '/': 'index.js' } }, '/dist')
    expect(fn).toHaveBeenCalledOnce()
    expect(fn.mock.calls[0]![0]).toMatchObject({ outDir: '/dist' })
  })
})

describe('config loading', () => {
  it('returns null when no config file exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mini-cfg-'))
    try {
      const cfg = await loadConfigFile(dir, 'dev')
      expect(cfg).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('loads mini.config.ts with a default export object', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mini-cfg-'))
    try {
      await writeFile(
        join(dir, 'mini.config.ts'),
        `export default { routesDir: './x', port: 4321 }\n`,
      )
      const cfg = await loadConfigFile(dir, 'dev')
      expect(cfg).toMatchObject({ routesDir: './x', port: 4321 })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('resolveConfig makes paths absolute', () => {
    const cwd = resolve('/tmp', 'mini-test-proj')
    const config = resolveConfig({ routesDir: './app' }, 'dev', cwd)
    expect(path.isAbsolute(config.routesDir)).toBe(true)
    expect(config.routesDir).toBe(join(cwd, 'app'))
  })
})
