import type { IncomingMessage, ServerResponse } from 'node:http'
import { createCtx } from '../src/http/context.js'
import type { Ctx } from '../src/http/types.js'

export class FakeRes {
  statusCode = 200
  headers = new Map<string, string>()
  body = ''
  headersSent = false
  setHeader(k: string, v: string) {
    this.headers.set(k.toLowerCase(), v)
  }
  end(chunk?: string) {
    if (chunk) this.body += chunk
    this.headersSent = true
  }
  destroy() {
    this.headersSent = true
  }
}

export function makeCtx(method: string, url: string): { ctx: Ctx; res: FakeRes } {
  const req = { method, url, headers: {} } as unknown as IncomingMessage
  const res = new FakeRes()
  const ctx = createCtx(req, res as unknown as ServerResponse)
  return { ctx, res }
}
