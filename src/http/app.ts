import http from 'node:http'
import { compose } from './compose.js'
import { createCtx } from './context.js'
import { createRouter, type Method } from './router.js'
import { loadFileRoutes } from '../router/files.js'
import type { Ctx, Middleware, RouteChain } from './types.js'

export interface App {
  use(mw: Middleware): App
  get(path: string, ...chain: RouteChain): App
  post(path: string, ...chain: RouteChain): App
  put(path: string, ...chain: RouteChain): App
  patch(path: string, ...chain: RouteChain): App
  delete(path: string, ...chain: RouteChain): App
  listen(port: number, cb?: () => void): http.Server
  handle(ctx: Ctx): Promise<void>
  /** Load routes from a directory. Call before listen(). */
  routes(dir: string): Promise<App>
}

export function createApp(): App {
  const middlewares: Middleware[] = []
  const router = createRouter()

  const routerMiddleware: Middleware = async (c) => {
    const match = router.match(c.method, c.path)

    if (match) {
      // Populate params in-place so the readonly reference stays stable.
      Object.assign(c.params, match.params)
      await match.run(c)
      return
    }

    const allowed = router.allowedMethods(c.path)
    if (allowed.length > 0) {
      c.res.statusCode = 405
      c.res.setHeader('Allow', allowed.join(', '))
      c.res.end('Method Not Allowed')
      return
    }

    c.res.statusCode = 404
    c.res.end('Not Found')
  }

  const register =
    (method: Method) =>
    (path: string, ...chain: RouteChain): App => {
      router.add(method, path, chain)
      return app
    }

  const app: App = {
    use(mw) {
      middlewares.push(mw)
      return app
    },
    get: register('GET'),
    post: register('POST'),
    put: register('PUT'),
    patch: register('PATCH'),
    delete: register('DELETE'),

    async routes(dir) {
      const found = await loadFileRoutes(dir)
      for (const r of found) {
        router.add(r.method, r.pattern, [r.handler])
      }
      console.log(`[mini] loaded ${found.length} route(s) from ${dir}`)
      return app
    },

    async handle(ctx) {
      const run = compose<Ctx>([...middlewares, routerMiddleware])
      await run(ctx)
    },

    listen(port, cb) {
      const server = http.createServer((req, res) => {
        const ctx = createCtx(req, res)
        app.handle(ctx).catch((err: unknown) => {
          console.error('[mini] unhandled error:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.end('Internal Server Error')
          } else {
            res.destroy()
          }
        })
      })
      server.listen(port, cb)
      return server
    },
  }

  return app
}
