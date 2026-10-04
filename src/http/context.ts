import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Ctx } from './types.js'

export function createCtx(req: IncomingMessage, res: ServerResponse): Ctx {
  // req.url is like '/users?x=1'. URL with a fake base parses both parts.
  const url = new URL(req.url ?? '/', 'http://localhost')
  return {
    req,
    res,
    method: (req.method ?? 'GET').toUpperCase(),
    path: url.pathname,
    query: url.searchParams,
    params: {},
    state: {},
  }
}
