# mini

A miniature full-stack framework built from scratch for learning.

SSR, hydration, signals, HMR, file-based routing. No React, no
Next, no bundler magic — just the mechanics, visible.

## Quick start

    pnpm install
    pnpm dev examples/todo/app
    open http://localhost:3000

Edit a page under `examples/todo/app/` and the browser updates
without a full reload. State survives.

## What's inside

    src/
      http/          request lifecycle: compose, context, router, app
      router/        filesystem -> routes
      runtime/       VNode, SSR, hydrate, render, signals (client-side)
      dev/           live reload, HMR (SSE)
      build/         esbuild prod bundle + manifest
      cli.ts         mini dev | build | start

## Commands

    mini dev <dir>     dev server with HMR (default: ./app)
    mini build <dir>   produce dist/ (client bundles + manifest)
    mini start <dir>   serve dist/ (no esbuild at runtime)

## Docs

Concepts are written up under `docs/concepts/`. Read them in order:

    00-overview.md
    01-middleware.md
    02-http-core.md
    03-file-routing.md
    04-ssr.md
    05-hydration-bundle.md
    06-reactivity.md
    07-live-reload.md
    08-hmr.md
    09-build.md

## License

MIT
