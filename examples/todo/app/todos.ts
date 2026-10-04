import type { Handler } from 'mini'

const todos = new Map<string, { id: string; text: string; done: boolean }>([
  ['1', { id: '1', text: 'learn compose', done: true }],
  ['2', { id: '2', text: 'learn trie', done: false }],
])

export const GET: Handler = (ctx) => {
  ctx.res.setHeader('content-type', 'application/json')
  ctx.res.end(JSON.stringify([...todos.values()]))
}

export const POST: Handler = async (ctx) => {
  const chunks: Buffer[] = []
  for await (const chunk of ctx.req) chunks.push(chunk as Buffer)
  const body = Buffer.concat(chunks).toString('utf8')

  const id = String(todos.size + 1)
  const todo = { id, text: body || '(empty)', done: false }
  todos.set(id, todo)

  ctx.res.statusCode = 201
  ctx.res.setHeader('content-type', 'application/json')
  ctx.res.end(JSON.stringify(todo))
}
