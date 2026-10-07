import type { Middleware } from '../http/types.js'
import { bundleClient } from '../build/client-bundle.js'
import { eventsMiddleware } from './events.js'
import type { BundleCache } from './cache.js'

export interface DevMiddlewareOptions {
  /** Absolute path to the routes directory. Bundles must come from inside it. */
  routesDir: string
  cache: BundleCache
}

export function devMiddleware(opts: DevMiddlewareOptions): Middleware {
  const routesDirNorm = opts.routesDir.replace(/\\/g, '/').replace(/\/+$/, '')
  const events = eventsMiddleware()

  return async (ctx, next) => {
    if (!ctx.path.startsWith('/_mini/')) return next()

    if (ctx.path === '/_mini/events') {
      await events(ctx, () => Promise.resolve())
      return
    }

    if (ctx.path === '/_mini/client.js') {
      const page = ctx.query.get('page')
      if (!page) {
        ctx.res.statusCode = 400
        ctx.res.end('missing ?page')
        return
      }

      const pageNorm = page.replace(/\\/g, '/')
      if (!pageNorm.startsWith(routesDirNorm + '/')) {
        ctx.res.statusCode = 403
        ctx.res.end('forbidden')
        return
      }

      let code = opts.cache.get(pageNorm)
      if (!code) {
        try {
          code = await bundleClient({ pageFile: page })
          opts.cache.set(pageNorm, code)
        } catch (err) {
          console.error('[mini] bundle error:', err)
          ctx.res.statusCode = 500
          ctx.res.setHeader('content-type', 'text/plain; charset=utf-8')
          ctx.res.end(`bundle error:\n${(err as Error).message}`)
          return
        }
      }

      ctx.res.setHeader('content-type', 'application/javascript; charset=utf-8')
      // Never cache in dev — the whole point is fresh code.
      ctx.res.setHeader('cache-control', 'no-store')
      ctx.res.end(code)
      return
    }

    ctx.res.statusCode = 404
    ctx.res.end('dev route not found')
  }
}
