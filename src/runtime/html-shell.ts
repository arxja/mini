import type { Child } from './vnode.js'
import { renderToString } from './render-to-string.js'

export interface ShellOptions {
  title?: string
  /** JSON-safe props the client will use for hydration. */
  payload?: unknown
  /** Absolute path to the page's source file, sent as a query param. */
  pageFile?: string
}

export function renderShell(root: Child, opts: ShellOptions = {}): string {
  const inner = renderToString(root)
  const title = opts.title ?? 'mini'

  // Escape '<' so a payload containing '</script>' can't break out of the
  // <script> tag. JSON doesn't otherwise contain raw '<' except in strings.
  const payload = JSON.stringify(opts.payload ?? {}).replace(/</g, '\\u003c')

  const bundleScript = opts.pageFile
    ? `<script type="module" src="/_mini/client.js?page=${encodeURIComponent(opts.pageFile)}"></script>`
    : ''

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body>
  <div id="root">${inner}</div>
  <script>window.__MINI_PAYLOAD__ = ${payload}</script>
  ${bundleScript}
</body>
</html>`
}
