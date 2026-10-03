import http from 'node:http'
import { compose } from './compose.js'
import { createCtx } from './context.js'
import { createRouter, type Method } from './router.js'
import type { Ctx, Handler, Middleware } from './types.js'

export interface App {
  use(mw: Middleware): App
  get(path: string, handler: Handler): App
  post(path: string, handler: Handler): App
  put(path: string, handler: Handler): App
  patch(path: string, handler: Handler): App
  delete(path: string, handler: Handler): App
  listen(port: number, cb?: () => void): http.Server
  /**
   * Test hook: run a single request through the pipeline without binding
   * a port. Use this in tests; use `listen` in the CLI.
   */
  handle(ctx: Ctx): Promise<void>
}

export function createApp(): App {
  const middlewares: Middleware[] = []
  const router = createRouter()

  // The router middleware is *always* the last one in the chain.
  // It's the app's responsibility to append it — users never see it.
  const routerMiddleware: Middleware = async (c) => {
    const handler = router.match(c.method, c.path)
    if (handler) {
      await handler(c)
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

  const register = (method: Method) => (path: string, handler: Handler) => {
    router.add(method, path, handler)
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

    async handle(ctx) {
      const run = compose<Ctx>([...middlewares, routerMiddleware])
      await run(ctx)
    },

    listen(port, cb) {
      const server = http.createServer((req, res) => {
        const ctx = createCtx(req, res)
        app.handle(ctx).catch((err: unknown) => {
          // Top-level safety net. Nothing else caught this.
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
