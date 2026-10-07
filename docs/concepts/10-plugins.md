# 10 — Plugins

## The shape

    // mini.config.ts
    import { defineConfig } from 'mini'
    export default defineConfig({
      routesDir: './app',
      plugins: [myPlugin()],
    })

    // plugin
    function myPlugin(): Plugin {
      return {
        name: 'my-plugin',
        configResolved(config) { ... },
        middleware() { return async (ctx, next) => { ... } },
        onRoute(route, config) { return route },
        buildEnd({ manifest, outDir }) { ... },
      }
    }

## The four hooks

| Hook           | When                | Replaces                  |
| -------------- | ------------------- | ------------------------- |
| configResolved | After config loaded | —                         |
| middleware     | Before routes load  | `app.use(...)` calls      |
| onRoute        | Per route, at boot  | Manual route registration |
| buildEnd       | After `mini build`  | —                         |

## Hook order

Plugins run in array order. `transformRoutes` chains `onRoute`
across plugins: each sees the output of the previous. Returning
`null` drops the route; returning `undefined` keeps it unchanged;
returning a new object replaces it.

## Every phase is a plugin

- **File routing** is a plugin that walks `routesDir` and calls
  `router.add` for each file.
- **Dev middleware** is a plugin that calls `app.use` with the
  SSE/bundle-serving middleware.
- **Static serving** is a plugin that reads files from `outDir`.
- **HMR** is a plugin with an `onChange`-style hook (not built yet —
  the watcher is currently in the CLI).

This is the framework lesson: **once you have the primitives, every
feature is a composition of them.** File routing isn't special — it's
a function that produces `router.add` calls.

## defineConfig is an identity function

    export function defineConfig(config: UserConfig): UserConfig {
      return config
    }

It exists for TypeScript. When you write `defineConfig({...})`, TS
checks the shape against `MiniConfig`. Without it, you'd get no
autocomplete and no errors on typos.

Same pattern as Vite's `defineConfig`, Vitest's, Next.js's. Every
framework has one.

## Config file discovery

Searched in cwd: `mini.config.ts`, `.mjs`, `.js`. First match wins.
Loaded via dynamic import with a cache-busting query (so a future
HMR-of-config could work).

Exports either an object or a function `({ mode }) => config`. The
function form lets you vary config per mode (different port for dev
vs prod, different plugins).

## CLI overrides config

`mini dev ./custom-app` overrides `routesDir`. This keeps the
"config file for defaults, CLI flags for overrides" convention that
every CLI tool uses.

## What's still missing

- **onChange hook** for plugins to react to file changes (HMR
  invalidation logic currently lives in the CLI).
- **onBuildStart / onBundle** — finer-grained build hooks.
- **Async onRoute** — currently synchronous. Async route
  transformation (fetch remote routes, compile config from a DB) is
  a real use case.
- **Plugin ordering constraints** — `enforce: 'pre' | 'post'` like
  Vite, so plugins can position themselves relative to others.
- **Config merging** — multiple config files (workspace root +
  package) aren't supported.
