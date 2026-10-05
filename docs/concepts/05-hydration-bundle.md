# 05 — Getting the code to the browser

## The problem

Piece 4b gave us `hydrate(vnode, dom)`. But the browser doesn't
_have_ the component code. So hydrate never runs.

## The solution: per-page bundles

Every page's HTML shell includes:

    <script>window.__MINI_PAYLOAD__ = {...}</script>
    <script type="module" src="/_mini/client.js?page=<abs path>"></script>

The `?page=` query is the page's **absolute source path**. The
browser requests it, the server bundles that exact file with
esbuild, sends it back.

Why per-page and not one bundle? A single bundle would include
every page's code. Slow, wasteful. Per-page is what Next.js, Vite,
and everyone else does.

## The virtual entry

esbuild doesn't bundle a file; it bundles a _string_ we hand it via
`stdin`. That string is our actual entry point:

    import { hydrate } from "./runtime/hydrate.ts"
    import Component from "../<routes>/page.tsx"

    const payload = window.__MINI_PAYLOAD__ ?? {}
    const root = document.getElementById('root')
    hydrate(Component({ ...payload }), root)

No temp file on disk. esbuild builds it in memory, returns the
output. This is the standard on-demand bundling pattern.

## Server / client boundary

The bundler must not include server code in the client bundle.
`src/index.ts` (the server entry) re-exports from `http/app.ts`,
which imports `node:http`. Bundle that and esbuild fails on every
Node built-in.

Fix: **two entries, one shared core.**

    src/index.ts          <- server: full API, may import node:*
    src/runtime/index.ts  <- client: VNode, h(), hydrate() only
    src/runtime/vnode.ts  <- shared: no environment-specific imports
    src/runtime/hydrate.ts <- shared
    src/runtime/jsx-runtime.ts <- shared

`alias: { mini: 'src/runtime/index.ts' }` in esbuild redirects
whatever the page imports from 'mini' to the client-safe entry.

This is the same pattern as:

- react vs react-dom/server
- next/client vs next/server
- @remix-run/react vs @remix-run/server-runtime

Rule: shared code has no environment imports. Entries cherry-pick.

## Bundler input forms (esbuild)

| Form             | Example          | Works in stdin resolver?         |
| ---------------- | ---------------- | -------------------------------- |
| Bare             | `'lodash'`       | Yes (node_modules or alias)      |
| Relative         | `'./foo.ts'`     | Yes (against resolveDir)         |
| file:// URL      | `file:///E:/...` | **No** — treated as package name |
| Absolute FS path | `E:\Dev\...`     | Fragile on Windows               |

Use relative paths + resolveDir for virtual entries. Every other
form has caveats.

## Security notes

Two guards in devMiddleware:

1. **Path traversal:** only bundle files inside routesDir. Compare
   with trailing slash (`routesDir + '/'`) so `/app-evil` doesn't
   match `routesDir = '/app'`.

2. **JSON-in-HTML:** the payload is JSON.stringify'd, then `<` is
   replaced with `\u003c`. Without this, a payload containing
   `</script>` breaks out of the script tag and injects HTML.

Both are standard. Both are easy to forget. Keep them.

## Still missing

- HMR (Phase 3) — bundle cache is eternal; page changes need hard refresh.
- Bundle size discipline — every page bundles the whole runtime.
- TS type-checking on the bundled output — esbuild strips types,
  `pnpm typecheck` runs separately on the source.
- Reactivity (piece 4d) — clicks fire, but nothing re-renders yet.
