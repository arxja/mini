import type { Handler } from 'mini'

export const GET: Handler = (ctx) => {
  ctx.res.setHeader('content-type', 'application/json')
  ctx.res.end(JSON.stringify({ id: ctx.params.id }))
}
