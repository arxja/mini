# 09 — Build

## The split

Dev bundles lazily (per request). Prod bundles eagerly (once, ahead
of time). Same code, different timing.

## Artifacts

    dist/
      manifest.json    { pages: { "/": "index.js", "/about": "about.js" } }
      client/
        index.js
        about.js

One JS per page. Manifest maps pattern -> filename.

## Bundle URLs are the interface

`renderShell` takes a `bundleUrl` string:

- Dev: `/_mini/client.js?page=<abs>`
- Prod: `/assets/index.js`

The shell doesn't know which mode it's in. `loadFileRoutes` takes a
`bundleUrl` resolver; `app.routes` forwards it. Mode-specific logic
lives at the CLI boundary.

## Dev vs prod entry (the virtual entry string)

The esbuild entry differs by mode:

- **Dev:** reads restore data from sessionStorage BEFORE the dynamic
  import of the page (so keyed signals see restored values). Opens
  `EventSource('/_mini/events')` for HMR.
- **Prod:** no HMR, no restore data, no EventSource. Dynamic import +
  hydrate/render, done.

esbuild tree-shakes the dev-only imports entirely — they aren't in
the prod entry string, so they're never bundled.

## Static serving

`serveStatic({ dir, prefix })` reads files from disk, sets content-type
from extension, and guards against path traversal.

**Two layers of protection:**

1. `createCtx` uses `new URL(req.url, base)` — the WHATWG parser
   normalizes `..` segments. By the time `ctx.path` reaches the
   middleware, `/assets/../../etc/passwd` is `/etc/passwd`.
2. `serveStatic` normalizes and checks `includes('..')` anyway.
   Defense in depth: catches non-conforming clients/proxies and any
   future change to the context layer.

The guard is the _second_ line, not the first. Both matter.

## Side by side

    Feature         dev                        prod
    -------         ---                        ----
    Bundling        on-demand per request       upfront in mini build
    HMR             SSE + sessionStorage        none
    Cache           in-memory Map              filesystem
    Client URL      /_mini/client.js?page=...  /assets/<slug>.js
    Minify          no                         yes
    Sourcemap       inline                     none

## What's still missing

- **Server bundling.** `mini start` still uses `tsx`. A self-contained
  `dist/server.js` would let you deploy without the framework source.
- **Content-hashed asset names** + `immutable` cache headers.
- **Code splitting.** One bundle per page, no shared chunks. Every
  page ships the whole runtime.
- **Asset imports.** `<img src={logo} />` — no story yet.
- **Prod error pages.** 500s render plain text.
