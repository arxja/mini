import type { Middleware } from '../http/types.js'

// Every connected browser, keyed by a "send" function.
const clients = new Set<(data: string) => void>()

/** Push a message to every connected client. */
export function broadcast(event: string): void {
  console.log(`[mini] broadcast "${event}" to ${clients.size} client(s)`)
  for (const send of clients) {
    try {
      send(event)
    } catch {
      // Client vanished mid-write; it'll be cleaned up by its own 'close'.
    }
  }
}

export function eventsMiddleware(): Middleware {
  return async (ctx) => {
    if (ctx.path !== '/_mini/events') {
      // Not our route — let the chain continue.
      // But we're a terminal middleware without next; so 404.
      ctx.res.statusCode = 404
      ctx.res.end()
      return
    }

    ctx.res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    // SSE comments keep the connection warm through proxies.
    ctx.res.write(': connected\n\n')

    const send = (data: string): void => {
      ctx.res.write(`data: ${data}\n\n`)
    }
    clients.add(send)
    console.log(`[mini] SSE client connected (${clients.size} total)`)

    ctx.req.on('close', () => {
      clients.delete(send)
      console.log(`[mini] SSE client disconnected (${clients.size} remain)`)
    })
    // Do NOT end the response — it stays open.
  }
}
