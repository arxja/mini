import type { Handler } from './types.js'

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface Route {
  method: Method
  path: string
  handler: Handler
}

export interface Router {
  add(method: Method, path: string, handler: Handler): void
  match(method: string, path: string): Handler | undefined
  allowedMethods(path: string): Method[]
}

export function createRouter(): Router {
  const routes: Route[] = []

  return {
    add(method, path, handler) {
      routes.push({ method, path, handler })
    },

    match(method, path) {
      // Linear scan. Phase 1 only. Phase 2 replaces with a trie.
      return routes.find((r) => r.method === method && r.path === path)?.handler
    },

    allowedMethods(path) {
      return routes.filter((r) => r.path === path).map((r) => r.method)
    },
  }
}
