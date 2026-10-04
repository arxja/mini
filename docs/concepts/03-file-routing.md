# 03 — File-based routing

## The mapping

    Filesystem              URL pattern
    index.ts                /
    about.ts                /about
    users/index.ts          /users
    users/[id].ts           /users/:id
    users/[id]/posts.ts     /users/:id/posts

Files starting with `_` or `.` are ignored. Extensions: `.ts`, `.js`.

## Method exports

Each route file exports one function per HTTP verb:

    import type { Handler } from 'mini'
    export const GET: Handler = (ctx) => ...
    export const POST: Handler = (ctx) => ...

Same URL, multiple verbs. Router's `allowedMethods` handles 405s
automatically. A file with no method exports logs a warning at boot
and is skipped.

## The walker is a policy, not a mechanism

`walk()` is a trivial readdir. The _rules_ — skip `_*.ts`, skip
dotfiles, only `.ts`/`.js`, recurse only into directories — are the
framework's opinion. Keep them in one place. Every framework hides a
policy here; ours is visible.

## Path -> pattern is pure

`fileToPattern` is pure: no I/O, no state, no imports. Unit-tested
exhaustively because we _can_. Pure cores with I/O shells is the
pattern to reach for whenever a function looks like it's "mostly I/O".

## Dynamic import, three rules

- The URL must be `file://` — use `pathToFileURL(abs).href`.
- Under tsx and vitest, `.ts` imports work natively.
- The ESM cache is keyed by URL. Re-importing the same URL gives the
  same module object. Phase 3 (HMR) works around this with
  cache-busting query strings.

## Self-referencing package

`package.json`:

    "exports": { ".": "./src/index.ts" }

This lets any file inside the repo import from `'mini'` by name. Node's
self-reference feature. Route files never write relative paths back into
`src/`. The public API surface is `src/index.ts` and nothing else —
everything under `src/` besides it is internals.

## Convention is a boot-time concern

File routing changes nothing about how requests flow. `app.handle(ctx)`
still runs global middleware -> router middleware -> matched chain. The
file loader only _populates_ the trie, once, at boot. Requests are pure
trie lookups.

## Still missing

- Catch-all routes (`[...slug].ts`) — needs wildcard support in trie.
- Optional params (`[[id]].ts`).
- Route groups (`(marketing)/`).
- Page components (default export + JSX) — Phase 4.
- Per-route middleware from files — Phase 4.
- HMR — after Phase 4.
