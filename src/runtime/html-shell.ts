import type { Child } from './vnode.js'
import { renderToString } from './render-to-string.js'

export interface ShellOptions {
  title?: string
  payload?: unknown
  /** Full URL for the client bundle script. Dev or prod, doesn't matter. */
  bundleUrl?: string
}

export function renderShell(root: Child, opts: ShellOptions = {}): string {
  const inner = renderToString(root)
  const title = opts.title ?? 'mini'
  const payload = JSON.stringify(opts.payload ?? {}).replace(/</g, '\\u003c')
  const script = opts.bundleUrl ? `<script type="module" src="${opts.bundleUrl}"></script>` : ''

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body>
  <div id="root">${inner}</div>
  <script>window.__MINI_PAYLOAD__ = ${payload}</script>
  ${script}
</body>
</html>`
}
