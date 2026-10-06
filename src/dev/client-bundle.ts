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
import { effect } from ${JSON.stringify(signalPath)}
import Component from ${JSON.stringify(pagePath)}

const payload = window.__MINI_PAYLOAD__ ?? {}
const root = document.getElementById('root')
if (!root) throw new Error('[mini] missing #root element')

let first = true
effect(() => {
  const tree = Component({ ...payload })
  if (first) {
    // First run: HTML already exists. Attach to it, don't rebuild.
    hydrate(tree, root)
    first = false
  } else {
    // Subsequent runs: state changed. Replace and re-hydrate.
    render(tree, root)
  }
})
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
    target: 'es2020',
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
