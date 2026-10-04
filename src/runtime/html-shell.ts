import type { Child } from './vnode.js'
import { renderToString } from './render-to-string.js'

export interface ShellOptions {
  title?: string
  /** JSON-safe props the client will use later for hydration. */
  payload?: unknown
}

export function renderShell(root: Child, opts: ShellOptions = {}): string {
  const inner = renderToString(root)
  const title = opts.title ?? 'mini'
  const _payload = JSON.stringify(opts.payload ?? {})

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body>
  <div id="root">${inner}</div>
</body>
</html>`
}
