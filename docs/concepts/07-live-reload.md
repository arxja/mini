# 07 — Live reload

## What it does

Edit any file in the routes directory. Save. The browser reloads by
itself, showing the new content. No manual refresh.

## The five pieces

1. **Watcher** (`src/dev/watcher.ts`)
   `fs.watch(dir, { recursive: true })` — Node's built-in change
   notifier. Debounced (80ms) because editors fire multiple events
   per save (write, rename, change).

2. **Cache invalidation** (`src/dev/cache.ts`)
   Bundle cache holds esbuild output. `invalidateAll()` clears it.
   Next request rebuilds fresh.

3. **Route re-walk** (`src/http/app.ts` + `src/router/files.ts`)
   On change: `router.clear()`, then `app.routes(dir)` re-walks the
   disk and re-imports every module with a cache-busting nonce.

4. **SSE channel** (`src/dev/events.ts`)
   `/_mini/events` is a `text/event-stream` response that never ends.
   The server writes `data: reload\n\n` to every connected client.

5. **Client listener** (in the bundle entry)
   `new EventSource('/_mini/events')` + `onmessage = reload if data
=== 'reload'`.

## Why SSE, not WebSocket

Communication is one-way: server → client. WebSocket is two-way and
requires `Upgrade` handling on the HTTP server. SSE is a plain HTTP
response. Fewer moving parts, no dependency.

**Rule:** choose the protocol that matches the direction of the data.
One-way → SSE. Two-way → WebSocket. Request/response → HTTP.

## Two caches, two fixes

When a file changes, two caches must be invalidated:

- **Server bundle cache** — throw away esbuild output. Next request
  rebuilds.
- **Node ESM module cache** — `import(samePath)` returns the same
  module object forever. Fix: append `?v=<nonce>` to the URL. A
  different URL is a different cache key.

**This is the most important lesson in this phase.** "I re-read the
file" is not the same as "I got fresh code." Node caches ESM modules
by URL. Vite and Next both do exactly this (`?t=1701234567`).

## Rebuild, don't mutate

`app.routes(dir)` clears the trie first. Idempotent: safe to call
again, always produces the same state for the same disk contents.

Without `router.clear()`, calling `routes()` twice would duplicate
every route. The old handler would win for static paths (tries are
insertion-ordered at the same node).

## Dev server owns the loop

The `dev` script is `tsx src/cli.ts dev` — **no `watch`**. `tsx watch`
was restarting the process on every edit, killing the SSE connection
before our watcher could act. Two watchers, one job → they fight.

The framework watches its own files. External watchers step aside.
Vite disables nodemon-style restarts for the same reason.

## SIGINT cleanup

`watcher.close()` on SIGINT/SIGTERM. Otherwise the process hangs on
open file handles and the terminal is stuck.

Any time you open a resource (watcher, socket, timer) — clean it up
on shutdown.

## What's still missing

- **Real HMR** — we reload the whole page. React/Svelte HMR preserves
  component state by re-importing only the changed module and
  re-rendering. Needs a module graph and client-side hot-swapping.
- **Server code changes** — editing `src/` still requires a manual
  restart. tsx watch used to handle it; we removed it. A proper
  server-side module reload is a Phase 3b concern.
