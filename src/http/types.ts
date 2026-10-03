import type { IncomingMessage, ServerResponse } from 'node:http'

export interface Ctx {
  req: IncomingMessage
  res: ServerResponse
  state: Record<string, unknown>
}
