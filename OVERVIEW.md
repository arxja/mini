# mini — overview & cheat sheet

A miniature full-stack framework built from scratch. SSR, hydration,
signals, HMR, file routing, build. No React, no Next, no bundler
magic — just the mechanics, visible.

This file is the front door. Read it top to bottom once, then use the
concept table to jump into the deep dives under `docs/concepts/`.

---

## Table of contents

- [What you built, in one paragraph](#what-you-built-in-one-paragraph)
- [What you can do with it](#what-you-can-do-with-it)
- [The architecture, one diagram](#the-architecture-one-diagram)
- [Concepts at a glance](#concepts-at-a-glance)
- [Concept docs (deep dives)](#concept-docs-deep-dives)
- [Command reference](#command-reference)
- [File layout](#file-layout)
- [Dev vs prod, side by side](#dev-vs-prod-side-by-side)
- [Common pitfalls (and their fixes)](#common-pitfalls-and-their-fixes)
- [Glossary](#glossary)

---

## What you built, in one paragraph

A framework where you write `.tsx` files under `app/`, and it serves
them as full HTML pages that become interactive in the browser. Routes
come from the filesystem. The same component runs once on the server
(to produce HTML) and once in the browser (to attach events). State
lives in signals. Edit a file during development and the browser
updates, preserving state. `mini build` freezes the whole thing into
a `dist/` folder that `mini start` serves without any bundler at
runtime.

That's the whole framework. Everything else is details.

---

## What you can do with it

**Write a page** — `app/index.tsx`:

    import { signal } from 'mini'

    const [count, setCount] = signal(0, 'home-count')

    export default function Home() {
      return (
        <div>
          <h1>Hello</h1>
          <button onClick={() => setCount(count() + 1)}>
            count: {count()}
          </button>
        </div>
      )
    }

**Write an API route** — `app/todos.ts`:

    import type { Handler } from 'mini'

    export const GET: Handler = (ctx) => {
      ctx.res.setHeader('content-type', 'application/json')
      ctx.res.end(JSON.stringify([{ id: '1', text: 'learn trie' }]))
    }

    export const POST: Handler = async (ctx) => {
      // read body from ctx.req
    }

**Write a plugin** — `mini.config.ts`:

    import { defineConfig } from 'mini'

    export default defineConfig({
      routesDir: './app',
      port: 3000,
      plugins: [{
        name: 'logger',
        middleware: () => async (ctx, next) => {
          console.log(ctx.method, ctx.path)
          await next()
        },
      }],
    })

**Run it:**

    pnpm dev                 # dev server with HMR
    pnpm build               # produce dist/
    pnpm start               # serve dist/

---

## The architecture, one diagram

    REQUEST (browser)
        │
        ▼
    ┌────────────────────────────────────────────────────────┐
    │  node:http                                             │
    │     ↓                                                  │
    │  app.listen → createCtx → compose([...])               │
    │     ↓                                                  │
    │  global middleware (onion)                             │
    │     ↓                                                  │
    │  router middleware (the last one)                      │
    │     ↓                                                  │
    │  match(method, path) ──► route chain (pre-composed)    │
    │     ↓                                                  │
    │  ┌──────────────────┬──────────────────────────────┐   │
    │  │ .ts API route    │ .tsx page                    │   │
    │  │ raw response     │ Component → VNode            │   │
    │  │                  │ renderToString → HTML        │   │
    │  │                  │ + payload + bundle script    │   │
    │  └──────────────────┴──────────────────────────────┘   │
    │     ↓                                                  │
    │  res.end(html or json)                                 │
    └────────────────────────────────────────────────────────┘
        │
        ▼
    BROWSER
        │
        ├── paints SSR HTML immediately
        │
        └── fetches /_mini/client.js?page=<abs> (dev)
            or /assets/index.js (prod)
                │
                ▼
            bundle runs:
              effect(() => {
                tree = Component(payload)
                first ? hydrate(tree, root) : render(tree, root)
              })
                │
                ▼
            events attached → clicks work
                │
                ▼
            signal changes → effect re-runs → render → DOM updates

---

## Concepts at a glance

Plain-words summaries. Deep dives linked below.

| Concept                 | One-line explanation                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Middleware onion**    | Functions that run in order, then unwrap in reverse. Errors travel through `await next()` + `try/catch`.    |
| **Compose**             | The 20-line function that chains middleware. The framework's personality.                                   |
| **Test seam**           | `app.handle(ctx)` runs a full request with no socket. Every serious framework has one.                      |
| **Trie router**         | A tree of path segments. Static beats param. Params accumulate on the way up.                               |
| **Pre-composition**     | Each route's chain is composed once at boot, not per request.                                               |
| **RouteChain**          | `readonly [...Middleware[], Handler]` — type-level enforcement that every route ends in a handler.          |
| **File routing**        | Filesystem → URL patterns. `app/users/[id].ts` → `/users/:id`.                                              |
| **Method exports**      | `.ts` files export `GET`/`POST`/... One URL, many verbs. 405s automatic.                                    |
| **VNode**               | A plain object `{ type, props, children }` describing UI. Components return VNodes.                         |
| **JSX**                 | Syntax that compiles to `h(...)`. Which `h` is configurable via `jsxImportSource`.                          |
| **SSR**                 | Server renders VNode → HTML string. Escapes text AND attributes. Strips `onX` props.                        |
| **Hydration**           | Browser re-runs the component and walks the VNode tree + DOM in parallel, attaching events.                 |
| **Hydration mismatch**  | Server and client trees differ. Loud error beats silent corruption.                                         |
| **Client bundle**       | esbuild bundles the page + runtime into one file. Per-page.                                                 |
| **Server/client split** | Two entries (`src/index.ts` server, `src/runtime/index.ts` client). Shared core has no `node:*` imports.    |
| **Payload**             | JSON embedded in the shell (`window.__MINI_PAYLOAD__`) so the client can reconstruct the component's props. |
| **Signals**             | `signal(init, key?)` returns `[get, set]`. get subscribes the active effect; set notifies subscribers.      |
| **Effect**              | `effect(fn)` re-runs `fn` when any signal it read changes. One global `activeEffect` variable.              |
| **Render**              | `render(vnode, container)` — clear, mount, hydrate. Replace, don't diff.                                    |
| **Live reload**         | `fs.watch` → invalidate → rebuild routes → SSE "reload" → browser reloads.                                  |
| **HMR**                 | Same as live reload, but keyed signals snapshot to sessionStorage and restore before page import.           |
| **Cache-busting**       | Dynamic import with `?v=<nonce>`. Node caches ESM modules by URL.                                           |
| **Build**               | `mini build` walks routes, bundles each page, writes `manifest.json` + `dist/client/*.js`.                  |
| **Static serving**      | Middleware that reads files from disk, sets content-type, guards traversal.                                 |
| **Plugins**             | `mini.config.ts` + plugin objects with hooks: `configResolved`, `middleware`, `onRoute`, `buildEnd`.        |
| **defineConfig**        | Identity function. Exists only for TypeScript autocomplete. Every framework has one.                        |

---

## Concept docs (deep dives)

In `docs/concepts/`, read in order:

| #   | File                                                        | What it covers                                                       |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 00  | [overview.md](docs/concepts/00-overview.md)                 | Project goals, acceptance test, what's out of scope                  |
| 01  | [middleware.md](docs/concepts/01-middleware.md)             | The onion, compose, error propagation, why Koa-style                 |
| 02  | [http-core.md](docs/concepts/02-http-core.md)               | Context, router, app layering, the trie, per-route middleware        |
| 03  | [file-routing.md](docs/concepts/03-file-routing.md)         | Filesystem → URL patterns, method exports, self-referencing package  |
| 04  | [ssr.md](docs/concepts/04-ssr.md)                           | VNode, renderToString, JSX runtime, hydration walk, mismatch         |
| 05  | [hydration-bundle.md](docs/concepts/05-hydration-bundle.md) | Server/client entries, esbuild alias, virtual entry, security guards |
| 06  | [reactivity.md](docs/concepts/06-reactivity.md)             | Signals, effects, the activeEffect trick, adjacent-text bug          |
| 07  | [live-reload.md](docs/concepts/07-live-reload.md)           | fs.watch, SSE, cache invalidation vs cache busting                   |
| 08  | [hmr.md](docs/concepts/08-hmr.md)                           | Keyed signals, sessionStorage, dynamic import + top-level await      |
| 09  | [build.md](docs/concepts/09-build.md)                       | Dev vs prod mode, manifest, static serving, path traversal           |
| 10  | [plugins.md](docs/concepts/10-plugins.md)                   | Plugin API, hooks, defineConfig, transformRoutes chaining            |

Each doc follows the same shape: _problem → shape → how real
frameworks do it → how ours differs._

---

## Command reference

| Command          | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `pnpm dev`       | Dev server at `http://localhost:3000` with HMR. Bundles on demand. |
| `pnpm build`     | Type-check + produce `dist/` (client bundles + manifest).          |
| `pnpm start`     | Serve `dist/` without esbuild. Production mode.                    |
| `pnpm test`      | Run vitest (all tests).                                            |
| `pnpm typecheck` | `tsc --noEmit`. Silent on success.                                 |
| `pnpm lint`      | ESLint, 0 errors expected.                                         |
| `pnpm format`    | Prettier write.                                                    |

CLI (when installed as a bin):

    mini dev [routesDir]      default: ./app
    mini build [routesDir]
    mini start [routesDir]

Routes directory can also come from `mini.config.ts`.

---

## File layout

    mini/
    ├── src/
    │   ├── index.ts              public server-side API
    │   ├── cli.ts                mini dev | build | start
    │   ├── http/
    │   │   ├── compose.ts        the onion (Koa-style)
    │   │   ├── context.ts        builds Ctx per request
    │   │   ├── router.ts         the trie
    │   │   ├── app.ts            pipeline + safety net + Node binding
    │   │   ├── static.ts         static file middleware
    │   │   └── types.ts          Ctx, Middleware, Handler, RouteChain
    │   ├── router/
    │   │   └── files.ts          walker → routes, cache-busted imports
    │   ├── runtime/
    │   │   ├── vnode.ts          VNode shape + h()
    │   │   ├── jsx-runtime.ts    JSX namespace + jsx/jsxs
    │   │   ├── render-to-string.ts   VNode → HTML (SSR)
    │   │   ├── html-shell.ts     full document wrapper + scripts
    │   │   ├── hydrate.ts        VNode + DOM → attach events
    │   │   ├── render.ts         mount + hydrate (client re-render)
    │   │   ├── signal.ts         signal + effect (reactivity)
    │   │   └── index.ts          public client-safe API
    │   ├── dev/
    │   │   ├── middleware.ts     /_mini/* endpoint handler
    │   │   ├── cache.ts          shared bundle cache
    │   │   ├── watcher.ts        fs.watch with debounce
    │   │   └── events.ts         SSE broadcast
    │   ├── build/
    │   │   ├── client-bundle.ts  esbuild, dev/prod modes
    │   │   ├── build.ts          walk + bundle + write manifest
    │   │   └── manifest.ts       read manifest.json
    │   └── plugin/
    │       ├── types.ts          Plugin, MiniConfig, defineConfig
    │       ├── load.ts           find + load mini.config.ts
    │       ├── runner.ts         run hooks in order
    │       └── index.ts          re-exports
    │
    ├── examples/todo/
    │   ├── mini.config.ts
    │   ├── plugins/todo.ts
    │   └── app/
    │       ├── index.tsx         page (/)
    │       ├── about.tsx         page (/about)
    │       ├── todos.ts          API route
    │       └── todos/[id].ts     API route with param
    │
    ├── tests/                    90 tests
    ├── docs/concepts/            deep-dive docs (see table above)
    ├── dist/                     build output (gitignored)
    ├── JOURNAL.md                session-by-session notes
    ├── OVERVIEW.md               this file
    └── README.md                 quick start

---

## Dev vs prod, side by side

| Feature        | Dev                           | Prod                                           |
| -------------- | ----------------------------- | ---------------------------------------------- |
| Bundling       | On demand, per request        | Upfront in `mini build`                        |
| HMR            | SSE + sessionStorage          | none                                           |
| Bundle cache   | In-memory Map                 | Filesystem                                     |
| Client URL     | `/_mini/client.js?page=<abs>` | `/assets/<slug>.js`                            |
| Minify         | no                            | yes                                            |
| Sourcemap      | inline                        | none                                           |
| Server runtime | `tsx` (TS on the fly)         | `tsx` (still — server bundling is future work) |

---

## Common pitfalls (and their fixes)

**Hydration mismatch: "VNode has N children, DOM has M"**
The server's tree and the client's tree differ. Causes:
non-determinism (`Date.now()`, `Math.random()`), `window` access
during render, missing payload state, or adjacent text nodes.
Fix: make the component a pure function of its props. If you're
mixing text and expressions (`<div>count: {n}</div>`), make sure
`h()` merges adjacent text children.

**Edit a file, nothing changes**
Node caches ESM modules by URL. Re-importing the same path returns
the same module. Fix: append `?v=<nonce>` to the dynamic import URL.

**Two live-reload loops fighting**
`tsx watch` and our own watcher both fire on file change. Fix:
remove `watch` from the dev script. Dev server owns the loop.

**Page shows old content after reload**
Bundle cache wasn't invalidated. Fix: `cache.invalidateAll()` in
the watcher callback, plus `cache-control: no-store` on the bundle
response.

**`Could not resolve "node:http"` in the client bundle**
The client entry reached server code. Fix: page files import from
`'mini'`, esbuild alias redirects to `src/runtime/index.ts`
(client-safe). Never import from `src/http/*` in a page.

**Top-level await not supported**
esbuild target must be `es2022` or newer. Fix: bump the target.

**`next() called multiple times`**
A middleware called `next()` twice. Fix: the `index` high-water
mark in `compose.ts` prevents this. Check your middleware.

**405 for a route you know exists**
The path matches a different method. Check the `Allow` header in
the response — it lists the verbs the file exports.

**Path traversal test fails**
`new URL()` normalizes `..` before the middleware sees it. The
guard is defense in depth, not the primary protection. Test the
_property_ ("file isn't served"), not the status code.

---

## Glossary

**Ctx** — per-request object: `req`, `res`, `method`, `path`,
`query`, `params`, `state`. Fresh per request.

**Middleware** — `(ctx, next) => Promise<void>`. Koa-style onion.

**Handler** — `(ctx) => void | Promise<void>`. Terminal. No `next`.

**RouteChain** — `readonly [...Middleware[], Handler]`. Every route
ends in exactly one handler.

**VNode** — `{ type, props, children }`. Plain object describing UI.

**Component** — function returning `VNode | string | number | null`.

**Page** — a `.tsx` file under `routesDir`. Default export is a
Component.

**API route** — a `.ts` file under `routesDir`. Named method exports
(`GET`, `POST`, ...).

**Pattern** — a URL template like `/users/:id`. `:name` captures a
segment.

**Trie** — tree of path segments. Static beats param. Built once at
boot.

**Payload** — JSON blob in the shell (`window.__MINI_PAYLOAD__`)
carrying props the client needs for hydration.

**Hydration** — walking the VNode tree + existing DOM in parallel,
attaching events. Never creates DOM.

**Effect** — a function that re-runs when any signal it read changes.

**Signal** — a value with a getter and setter, and a subscriber set.

**HMR** — state-preserving reload. Keyed signals snapshot before
reload, restore after.

**Manifest** — `dist/manifest.json`. Maps route pattern → bundle
filename.

**Plugin** — an object with a `name` and hooks. Registered via
`mini.config.ts`.
