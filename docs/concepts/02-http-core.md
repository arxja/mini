# 02 — HTTP core

## The layering

node:http → app lifecycle → compose → router

Each layer has one job:

- node:http: bytes ↔ Node objects
- app: per-request scope, error safety, one public test seam
- compose: ordering (the onion)
- router: dispatch (method+path → handler)

## Per-request context (Ctx)

Why bundle req/res into one object?

- Express passes (req, res) and middleware invents property names on req.
  That causes collisions when two middleware want `req.user`.
- Koa/ours: `ctx.state` is the _sanctioned_ place to hand data downstream.

Why `readonly` on req/res/method/path/query but mutable state?

- The frame of a request must not change (catching `ctx.method = 'POST'`
  is a bug, not a feature).
- The payload of a request must be writable (auth writes ctx.state.user,
  downstream reads it).

## Router as middleware, not as a special case

The router is the _last_ middleware. It's appended at `handle()` time
so it's always after every user middleware, regardless of when they
registered. This is a structural guarantee, not a convention.

Why does the router not decide 404 vs 405 itself?

- `match()` returns `Handler | undefined`. Whether "no handler" means
  404, 405, redirect, or A/B test is _policy_, and policy belongs to
  the caller. The router is a lookup — nothing more.

## 404 vs 405

- 404: no route for this path.
- 405: path exists, but not for this method. Return `Allow: <methods>`.
- This is the difference between a framework that respects HTTP and
  one that pretends HTTP is just paths and functions.

## The test seam

`app.handle(ctx)` exists so tests can run a full request without a
socket. Every serious framework has one (Koa's `app.callback()`,
Hono's `app.request()`). When you build your own thing later, add this
seam from day 1. It's why `tests/app.test.ts` runs in microseconds.

## The last line of defense

`listen()` wraps `handle()` in `.catch()`:

- If nothing caught the error and headers haven't been sent → send 500.
- If headers were already sent (streaming started) → destroy the socket.
  Sending another 500 would append garbage to the body.

## What our version doesn't have (yet)

- Path params (`/users/:id`) — Phase 2.
- Wildcard routes — Phase 2.
- Per-route middleware — Phase 2.
- Route trie — Phase 2. Right now `match()` is O(n). At n=20 it's
  nanoseconds; the trie's value will be _felt_ when we have 200 routes.
- Request body parsing — probably Phase 4.
- Response helpers (`ctx.json()`, `ctx.html()`) — Phase 4.

## Reading

- Koa's context: https://koajs.com/#context
- Express's req/res (for contrast): https://expressjs.com/en/4x/api.html
- HTTP 405 spec: RFC 9110 §15.5.6
