import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Middleware as GenericMiddleware } from './compose.js'

/**
 * Per-request context. Fresh instance for every request — never shared.
 * Middleware communicate through `state`.
 */
export interface Ctx {
  /** Raw Node request. Escape hatch — prefer sugar below when possible. */
  readonly req: IncomingMessage
  /** Raw Node response. Escape hatch. */
  readonly res: ServerResponse
  /** Upper-case HTTP method, e.g. 'GET'. */
  readonly method: string
  /** Pathname, no query string. e.g. '/users'. */
  readonly path: string
  /** Parsed query string. */
  readonly query: URLSearchParams
  /** Per-request bag. Middleware write; downstream reads. */
  readonly state: Record<string, unknown>
}

/** Framework-concrete alias. */
export type Middleware = GenericMiddleware<Ctx>

/** A terminal handler — no `next`. Used by routes. */
export type Handler = (ctx: Ctx) => Promise<void> | void
