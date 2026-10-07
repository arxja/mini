import { build } from 'esbuild'
import { join, relative, resolve } from 'node:path'

const srcDir = resolve(import.meta.dirname, '..')

function rel(from: string, to: string): string {
  const r = relative(from, to).replace(/\\/g, '/')
  return r.startsWith('.') ? r : './' + r
}

export interface BundleOptions {
  pageFile: string
  mode?: 'dev' | 'prod'
}

export async function bundleClient(opts: BundleOptions): Promise<string> {
  const isProd = (opts.mode ?? 'dev') === 'prod'

  const hydratePath = rel(srcDir, join(srcDir, 'runtime', 'hydrate.ts'))
  const renderPath = rel(srcDir, join(srcDir, 'runtime', 'render.ts'))
  const signalPath = rel(srcDir, join(srcDir, 'runtime', 'signal.ts'))
  const pagePath = rel(srcDir, opts.pageFile)

  const head = `
import { hydrate } from ${JSON.stringify(hydratePath)}
import { render } from ${JSON.stringify(renderPath)}
import { effect } from ${JSON.stringify(signalPath)}
`

  const sharedTail = `
const payload = window.__MINI_PAYLOAD__ ?? {}
const root = document.getElementById('root')
if (!root) throw new Error('[mini] missing #root element')

let first = true
effect(() => {
  const tree = Component({ ...payload })
  if (first) { hydrate(tree, root); first = false }
  else render(tree, root)
})
`

  const entry = isProd
    ? `${head}
const { default: Component } = await import(${JSON.stringify(pagePath)})
${sharedTail}
`
    : `${head}
import { _setRestoreData, _collectSignals } from ${JSON.stringify(signalPath)}

const HMR_KEY = '__mini_hmr__'
const raw = sessionStorage.getItem(HMR_KEY)
if (raw) {
  try { _setRestoreData(JSON.parse(raw)) } catch { sessionStorage.removeItem(HMR_KEY) }
}

const { default: Component } = await import(${JSON.stringify(pagePath)})
${sharedTail}
sessionStorage.removeItem(HMR_KEY)

const es = new EventSource('/_mini/events')
es.onmessage = (e) => {
  if (e.data === 'hmr') {
    try { sessionStorage.setItem(HMR_KEY, JSON.stringify(_collectSignals())) } catch {}
    location.reload()
  } else if (e.data === 'reload') {
    sessionStorage.removeItem(HMR_KEY)
    location.reload()
  }
}
`

  const result = await build({
    stdin: {
      contents: entry,
      resolveDir: srcDir,
      loader: 'ts',
      sourcefile: 'mini-entry.ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    minify: isProd,
    sourcemap: isProd ? false : 'inline',
    jsx: 'automatic',
    jsxImportSource: 'mini',
    alias: {
      mini: join(srcDir, 'runtime', 'index.ts'),
      'mini/jsx-runtime': join(srcDir, 'runtime', 'jsx-runtime.ts'),
    },
    logLevel: 'silent',
  })

  return result.outputFiles[0]!.text
}
