import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import type { Middleware } from './types.js'

const MIME: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

export function serveStatic(opts: { dir: string; prefix: string }): Middleware {
  const { dir, prefix } = opts
  return async (ctx, next) => {
    if (!ctx.path.startsWith(prefix)) return next()

    const rel = ctx.path.slice(prefix.length)
    if (!rel) return next()

    // Defense in depth. Our URL parser (createCtx) already normalizes
    // '..' segments — by the time we see ctx.path, traversal like
    // '/assets/../../etc/passwd' is '/etc/passwd' and doesn't reach
    // here. This guard covers non-conforming clients/proxies and any
    // future change to the context layer.
    const safe = normalize(rel).replace(/^[/\\]+/, '')
    if (safe.includes('..')) {
      ctx.res.statusCode = 403
      ctx.res.end('forbidden')
      return
    }

    try {
      const data = await readFile(join(dir, safe))
      ctx.res.setHeader('content-type', MIME[extname(safe)] ?? 'application/octet-stream')
      // Content-hashed names would allow immutable; for now, medium cache.
      ctx.res.setHeader('cache-control', 'public, max-age=3600')
      ctx.res.end(data)
    } catch {
      ctx.res.statusCode = 404
      ctx.res.end('Not Found')
    }
  }
}
