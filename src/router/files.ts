import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Handler } from '../http/types.js'
import type { Method } from '../http/router.js'
import { renderShell } from '../runtime/html-shell.js'
import type { Component } from '../runtime/vnode.js'

const METHOD_NAMES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const satisfies readonly Method[]

export interface FileRoute {
  pattern: string
  method: Method
  handler: Handler
  /** Set for .tsx pages — absolute path of the source file. */
  sourceFile?: string
}

type RouteModule = Partial<Record<Method, Handler>> & { default?: Component }

export interface LoadOptions {
  /** Given a page's pattern and source path, return the URL to embed. */
  bundleUrl: (pattern: string, sourceFile: string) => string
}

const defaultBundleUrl = (_pattern: string, sourceFile: string): string =>
  '/_mini/client.js?page=' + encodeURIComponent(sourceFile)

// ---------------------------------------------------------------------------
// Pure: path → URL pattern
// ---------------------------------------------------------------------------

/**
 * Convert a file path (relative to the routes root) into a URL pattern.
 *
 *   'index.ts'              -> '/'
 *   'about.ts'              -> '/about'
 *   'users/index.ts'        -> '/users'
 *   'users/[id].ts'         -> '/users/:id'
 *   'users/[id]/posts.ts'   -> '/users/:id/posts'
 */
export function fileToPattern(rel: string): string {
  const noExt = rel.replace(/\.(ts|tsx|js|jsx)$/, '')
  const normalized = noExt.split(sep).join('/')
  const segments = normalized.split('/').filter(Boolean)
  if (segments[segments.length - 1] === 'index') segments.pop()
  const mapped = segments.map((s) => {
    const m = /^\[(\w+)\]$/.exec(s)
    return m ? `:${m[1]}` : s
  })
  return '/' + mapped.join('/')
}

// ---------------------------------------------------------------------------
// I/O: walk
// ---------------------------------------------------------------------------

const IGNORED = /^[_.]/

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (IGNORED.test(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

// ---------------------------------------------------------------------------
// I/O: load
// ---------------------------------------------------------------------------

let nonce = 0
function nextNonce(): number {
  return nonce++
}

async function loadModule(abs: string): Promise<RouteModule> {
  // file:// URL + a unique query string. Node's ESM cache keys on the
  // full URL, so a fresh nonce forces a fresh module load. Without this,
  // the second `import(abs)` returns the module from the first time.
  const url = pathToFileURL(abs).href + `?v=${Date.now()}-${nextNonce()}`
  return (await import(url)) as RouteModule
}

export async function loadFileRoutes(dir: string, opts?: LoadOptions): Promise<FileRoute[]> {
  const bundleUrl = opts?.bundleUrl ?? defaultBundleUrl
  const files = await walk(dir)
  const routes: FileRoute[] = []

  for (const abs of files) {
    const rel = relative(dir, abs)
    const pattern = fileToPattern(rel)
    const mod = await loadModule(abs)

    if (rel.endsWith('.tsx')) {
      const Component = mod.default
      if (typeof Component !== 'function') {
        console.warn(`[mini] .tsx without default export: ${rel}`)
        continue
      }
      routes.push({
        pattern,
        method: 'GET',
        handler: pageHandler(Component, bundleUrl(pattern, abs)),
        sourceFile: abs,
      })
      continue
    }

    let found = false
    for (const method of METHOD_NAMES) {
      const handler = mod[method]
      if (typeof handler === 'function') {
        routes.push({ pattern, method, handler })
        found = true
      }
    }
    if (!found) {
      console.warn(`[mini] no method exports in ${rel} — ignored`)
    }
  }

  return routes
}

function pageHandler(Component: Component, bundleUrl: string): Handler {
  return (ctx) => {
    const payload = {
      params: ctx.params,
      query: Object.fromEntries(ctx.query.entries()),
    }
    const root = Component(payload)
    const html = renderShell(root, { payload, bundleUrl })
    ctx.res.setHeader('content-type', 'text/html; charset=utf-8')
    ctx.res.end(html)
  }
}
