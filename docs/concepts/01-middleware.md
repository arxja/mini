# 01 — Middleware (the onion)

## What problem does this solve?

Every HTTP request passes through a series of cross-cutting concerns:
logging, auth, parsing, rate limiting, routing, error handling. These
must run in a predictable order, must be able to short-circuit
(return early), and must be able to catch errors from later stages.

## The shape

    type Middleware<C> = (ctx: C, next: NextFn) => Promise<void>

`next()` returns a Promise that resolves when the rest of the chain
finishes. So "post-work" is just code after `await next()`.

## The three questions

1. Order in: a → b → h
2. Order out: h → b → a (reverse)
3. Double next: throws — each slot runs at most once.

## Errors

Travel via `throw` / `catch` through `await next()`. A middleware can
catch errors from downstream only — never upstream. If nothing catches,
the error escapes `compose()` and the server turns it into a 500.

## How the real frameworks do it

- **Koa:** `koa-compose`. The ~20-line function we're reimplementing.
- **Express:** `(req, res, next) => void`, errors via `next(err)`,
  forgetting `next()` is a silent bug.
- **Hono:** Koa-shaped, typed context.
- **Fastify:** separate "hooks" (onRequest, preHandler, ...) instead of
  one linear chain.

## How our version differs

- No `ctx.next` property (Koa has one — footgun).
- Async-only middleware. Koa allows sync; we require `await` for uniformity.
- No special error handler slot. Errors are just exceptions.

## Reading

- https://github.com/koajs/compose/blob/master/index.js
