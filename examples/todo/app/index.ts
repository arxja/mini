import type { Handler } from 'mini'

export const GET: Handler = (ctx) => {
  ctx.res.setHeader('content-type', 'text/plain')
  ctx.res.end('todo app — try /todos')
}
