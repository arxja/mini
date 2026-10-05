import type { Middleware } from '../http/types.js'
import { bundleClient } from './client-bundle.js'

export interface DevMiddlewareOptions {
  /** Absolute path to the routes directory. Bundles must come from inside it. */
  routesDir: string
}

export function devMiddleware(opts: DevMiddlewareOptions): Middleware {
  // Cache by page path. Invalidate on HMR (Phase 3). For now: forever.
  const cache = new Map<string, string>()
  const routesDirNorm = opts.routesDir.replace(/\\/g, '/').replace(/\/+$/, '')

  return async (ctx, next) => {
    if (!ctx.path.startsWith('/_mini/')) return next()

    if (ctx.path === '/_mini/client.js') {
      const page = ctx.query.get('page')
      if (!page) {
        ctx.res.statusCode = 400
        ctx.res.end('missing ?page')
        return
      }

      // SECURITY: only bundle files inside routesDir.
      // The trailing slash matters — without it, '/app-evil/x.ts' would
      // pass a startsWith('/app') check.
      const pageNorm = page.replace(/\\/g, '/')
      if (!pageNorm.startsWith(routesDirNorm + '/')) {
        ctx.res.statusCode = 403
        ctx.res.end('forbidden')
        return
      }

      let code = cache.get(pageNorm)
      if (!code) {
        try {
          code = await bundleClient({ pageFile: page })
          cache.set(pageNorm, code)
        } catch (err) {
          console.error('[mini] bundle error:', err)
          ctx.res.statusCode = 500
          ctx.res.setHeader('content-type', 'text/plain; charset=utf-8')
          ctx.res.end(`bundle error:\n${(err as Error).message}`)
          return
        }
      }

      ctx.res.setHeader('content-type', 'application/javascript; charset=utf-8')
      ctx.res.end(code)
      return
    }

    ctx.res.statusCode = 404
    ctx.res.end('dev route not found')
  }
}
