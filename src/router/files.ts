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
}

type RouteModule = Partial<Record<Method, Handler>> & { default?: Component }

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

async function loadModule(abs: string): Promise<RouteModule> {
  // pathToFileURL is required — Node's dynamic import doesn't accept bare paths.
  // The `.href` gives us a 'file:///...' URL, which handles Windows drive
  // letters and spaces-in-paths correctly.
  return (await import(pathToFileURL(abs).href)) as RouteModule
}

export async function loadFileRoutes(dir: string): Promise<FileRoute[]> {
  const files = await walk(dir)
  const routes: FileRoute[] = []

  for (const abs of files) {
    const rel = relative(dir, abs)
    const pattern = fileToPattern(rel)
    const mod = await loadModule(abs)

    // .tsx files are pages: default export is a Component.
    if (rel.endsWith('.tsx')) {
      const Component = mod.default
      if (typeof Component !== 'function') {
        console.warn(`[mini] .tsx without default export: ${rel}`)
        continue
      }
      routes.push({
        pattern,
        method: 'GET',
        handler: pageHandler(Component),
      })
      continue
    }

    // .ts files are API routes: named exports per method.
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

function pageHandler(Component: Component): Handler {
  return (ctx) => {
    const root = Component({
      params: ctx.params,
      query: Object.fromEntries(ctx.query.entries()),
    })
    const html = renderShell(root, {
      payload: {
        params: ctx.params,
        query: Object.fromEntries(ctx.query.entries()),
      },
    })
    ctx.res.setHeader('content-type', 'text/html; charset=utf-8')
    ctx.res.end(html)
  }
}
