import { build } from 'esbuild'
import { join, relative, resolve } from 'node:path'

const srcDir = resolve(import.meta.dirname, '..')

/** Make a path into an import specifier relative to `from`. */
function rel(from: string, to: string): string {
  const r = relative(from, to).replace(/\\/g, '/')
  return r.startsWith('.') ? r : './' + r
}

export interface BundleOptions {
  pageFile: string
}

export async function bundleClient(opts: BundleOptions): Promise<string> {
  // resolveDir below is srcDir. Relative specifiers resolve against it.
  const hydratePath = rel(srcDir, join(srcDir, 'runtime', 'hydrate.ts'))
  const renderPath = rel(srcDir, join(srcDir, 'runtime', 'render.ts'))
  const signalPath = rel(srcDir, join(srcDir, 'runtime', 'signal.ts'))
  const pagePath = rel(srcDir, opts.pageFile)

  const entry = `
import { hydrate } from ${JSON.stringify(hydratePath)}
import { render } from ${JSON.stringify(renderPath)}
import { effect, _setRestoreData, _collectSignals } from ${JSON.stringify(signalPath)}

// -- HMR: restore signal values BEFORE the page module runs.
// The page's top-level 'signal(0, key)' calls run during import below.
// ESM evaluates dependencies in order, but the page's own module body
// runs after our imports. Dynamic import guarantees restoreData is set
// before 'signal()' is called.
const HMR_KEY = '__mini_hmr__'
const raw = sessionStorage.getItem(HMR_KEY)
if (raw) {
  try {
    _setRestoreData(JSON.parse(raw))
  } catch {
    sessionStorage.removeItem(HMR_KEY)
  }
}

const { default: Component } = await import(${JSON.stringify(pagePath)})

const payload = window.__MINI_PAYLOAD__ ?? {}
const root = document.getElementById('root')
if (!root) throw new Error('[mini] missing #root element')

let first = true
effect(() => {
  const tree = Component({ ...payload })
  if (first) { hydrate(tree, root); first = false }
  else render(tree, root)
})

// Mount succeeded — clear the snapshot so a manual hard-reload starts clean.
sessionStorage.removeItem(HMR_KEY)

// -- Live reload / HMR
const es = new EventSource('/_mini/events')
es.onmessage = (e) => {
  if (e.data === 'hmr') {
    // Preserve signal values across the reload.
    try {
      sessionStorage.setItem(HMR_KEY, JSON.stringify(_collectSignals()))
    } catch {
      // signals not JSON-serializable — fall through to a plain reload
    }
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
    minify: false,
    sourcemap: 'inline',
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
