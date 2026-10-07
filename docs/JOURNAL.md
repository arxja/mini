# Journal

One entry per session. 3–6 lines. What happened, what I learned, what's next.

## 2026-10-7

- Phase 3 complete. State-preserving reload working end-to-end.
- Learned: state survives only with stable identity. Explicit keys on
  signals. Vue infers identity from variable names; React from hook
  order; we make it explicit and visible.
- Learned: ESM static imports are hoisted above the importing module's
  body. To set restore data BEFORE a module evaluates, use dynamic
  import + top-level await.
- Learned: top-level await requires esbuild target es2022. The
  target/feature mismatch is a safety net — build fails rather than
  emitting code old browsers can't parse.
- Learned: sessionStorage is per-tab, survives reload, cleared on tab
  close. Right fit for "survive this reload once."
- Learned: distinguish 'hmr' from 'reload' events. One preserves
  state, the other starts fresh. Same infrastructure, different
  intent.
- 73 tests green. Counter survives file edits.
- Next: Phase 5 — build. esbuild prod bundle + server output.

## 2026-10-06

- Phase 3a done: live reload via fs.watch + SSE.
- Learned: tsx watch and our watcher fought. Dev server must own the
  file-watching loop exclusively. Removed `watch` from the dev script.
- Learned: ESM caches modules by URL. `import(samePath)` returns the
  same module forever. Cache-bust with `?v=<nonce>`.
- Learned: rebuild state, don't mutate it. app.routes() clears the
  trie first so re-walking is idempotent.
- Learned: observability before diagnosis. Added 3 log lines to
  broadcast/connect/disconnect and the bug became obvious in one run.
- Learned: SIGINT cleanup — close watchers, sockets, timers, or the
  process hangs.
- Next: Phase 3b — real HMR (module graph + state preservation).

## 2026-10-06

- Phase 4 complete. Signals + render + hydration all working.
- Learned: signals need a module-level "activeEffect" — getters
  subscribe to it, setters notify subscribers. No Proxy needed for
  top-level values.
- Learned: h() must merge adjacent text children. <button>a {x}</button>
  is 2 vnode children but 1 DOM text node. React uses comment markers;
  we merge at build time.
- Learned: server/client entry split is a real trade-off. Currently
  src/index.ts re-exports client stuff as a courtesy so TS resolves
  'mini' consistently. Fix is package.json exports split in Phase 6.
- Learned: replace-and-hydrate is simpler than diffing but loses DOM
  state. Diff is a later optimization.
- 68 tests green. Counter increments in browser.
- Next: Phase 3 (dev server + HMR) — the reward for all this: edit a
  page, browser updates without reload.

## 2026-10-05

- Phase 4c: per-page client bundles, real browser hydration.
- Learned: server/client boundary must be enforced at bundle time.
  Two entries + shared core. Same pattern as react/react-dom-server.
- Learned: esbuild stdin bundles a string, not a file. Virtual entry
  needs relative specifiers + resolveDir — file:// URLs break.
- Learned: esbuild alias is first-class. Prefer it over custom plugins
  for bare-specifier redirection.
- Learned: JSON-in-HTML needs `<` escaped to `\u003c` or a payload
  containing `</script>` breaks out of the tag.
- Learned: path guards need trailing-slash comparison to avoid
  prefix-confusion (app-evil vs app).
- 58 tests green. Click handler fires in a real browser.
- Next: piece 4d — signals + render(), then the todo app actually
  updates on click.

## 2026-10-04

- Phase 4b: JSX enabled + hydration walk.
- Learned: JSX is just syntax. TS rewrites it to a function call whose
  name is configurable via jsxImportSource. Same syntax as React now.
- Learned: hydration is a parallel walk of VNode tree and DOM tree,
  attaching events only. Doesn't touch anything else — the text and
  structure are already in the DOM from SSR.
- Learned: hydration mismatch = loud error, not silent drift. Caused
  by non-determinism, window access, or missing payload state.
- Learned: jsdom + per-file @vitest-environment pragma for DOM tests.
- Next: piece 4c — client bundling + real browser interactivity.

## 2026-10-04

- Phase 4 piece 1: SSR render only. .tsx pages return HTML.
- Learned: VNode is just an object. Components are just functions.
  renderToString is a simple recursive walk.
- Learned: escaping text AND attribute values is the #1 SSR security
  rule. XSS via user content is trivial without it.
- Learned: events can't be serialized. Server strips them. Client
  will reattach them during hydration (piece 2).
- Next: Phase 4 piece 2 — hydration. Same component runs in the
  browser, finds existing DOM, attaches events.

## 2026-10-04

- Phase 2 complete: trie router + file-based routing.
- Learned: static > param priority in trie. Backtracking requires
  params to accumulate on the way UP the recursion, not in a shared
  mutable object.
- Learned: pre-compose route chains at registration. Zero compose
  work per request.
- Learned: RouteChain tuple enforces "must end with a terminal
  handler" at the type level.
- Learned: file walker is a policy. fileToPattern is pure and cheap
  to unit-test exhaustively.
- Learned: `pathToFileURL` required for dynamic import; ESM caches
  by URL. HMR will need cache-busting.
- Learned: self-referencing package.json exports — files import from
  'mini' by name, no relative paths into src/.
- Learned: eslint scoped overrides — disable rules for the narrowest
  scope that unblocks. tests/fixtures/**/* allows `any`.
- 32 tests green. /todos/:id, 405 with Allow header, POST echo all
  work in the example app.
- Next: Phase 4 (SSR + minimal renderer). HMR after — building it
  without a client runtime is half a feature.

## 2026-10-04

- Phase 1 done: context, router, app, CLI demo. /hello serves.
- Learned: layering (server -> app -> compose -> router), test seam
  via app.handle(ctx), last-line-of-defense with headersSent check.
- Learned: 405 vs 404 is a real distinction (Allow header) — matters
  for clients. Router stays policy-free; policy lives in app.
- Learned: structural invariants > documented invariants. Router
  appended at handle() time, so it's always last.
- Next: Phase 2 — file-based routing.

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
