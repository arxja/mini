# Journal

One entry per session. 3–6 lines. What happened, what I learned, what's next.

## 2026-10-03

- Phase 1 done: context, router, app, and CLI demo. /hello serves.
- Learned: layering (server → app → compose → router), test seam via
  app.handle(ctx), last-line-of-defense with headersSent check.
- Learned: 405 vs 404 is a real distinction (Allow header) — matters
  for clients. Router stays policy-free; policy lives in app.
- Learned: structural invariants > documented invariants. Router
  appended at handle() time, so it's always last.
- Next: Phase 2 — file-based routing. Need to answer: should a route
  handler be able to call next() and fall through?

## 2026-10-03

- Phase 0 green: TS strict + NodeNext, vitest, eslint, prettier, tsx. Husky skipped (Windows pain, not worth it).
- Phase 1 start: wrote compose.ts — missed `index = i` in the double-next guard. Caught it in review.
- Wrote first tests (compose.test.ts, 5 tests).
- Learned: Koa-style errors travel through `throw`/`catch` via `await next()`. No `next(err)` special case.
- Next: server.ts + router.ts → a working `/hello` end-to-end.

## 2026-10-03

- Repo init. Prettier: no semis, single quotes. Strict TS: noUncheckedIndexedAccess + exactOptionalPropertyTypes.
- Learned: after every `pnpm add`, verify with `pnpm ls <tool>`. Config can reference phantom tools silently.
- Husky caused install to fail on Windows — removed it. Will add back in Phase 6 if wanted.
