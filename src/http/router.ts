import { compose } from './compose.js'
import type { Ctx, Handler, Middleware, RouteChain } from './types.js'

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** A pre-composed route. No params, no allocs at request time. */
type Runnable = (ctx: Ctx) => Promise<void>

interface TrieNode {
  /** Literal-segment children, keyed by segment. */
  static: Map<string, TrieNode>
  /** Param edge, if any. Only one per node — `/x/:a` and `/x/:b` collide. */
  param?: { name: string; node: TrieNode }
  /** Terminal runners, keyed by method. */
  routes: Map<Method, Runnable>
}

export interface Match {
  run: Runnable
  params: Record<string, string>
}

export interface Router {
  add(method: Method, path: string, chain: RouteChain): void
  match(method: string, path: string): Match | null
  allowedMethods(path: string): Method[]
}

// ---------------------------------------------------------------------------
// Node helpers
// ---------------------------------------------------------------------------

function makeNode(): TrieNode {
  return { static: new Map(), routes: new Map() }
}

/**
 * Split a path into segments. '/users/:id' -> ['users', ':id'].
 * Empty segments are dropped, so '/a/b/' and '//a//b' normalize to ['a','b'].
 * Root path '/' becomes [].
 */
function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0)
}

/**
 * Turn a RouteChain into a single async function.
 *
 * This is where per-route middleware meets the compose pipeline. The
 * handler is wrapped as a terminal middleware — a Middleware that ignores
 * `next` — so the shape matches what compose expects. Called ONCE per
 * route at registration time, never per request.
 */
function toRunnable(chain: RouteChain): Runnable {
  const mws = chain.slice(0, -1) as Middleware[]
  const handler = chain[chain.length - 1] as Handler
  const terminal: Middleware = async (c) => {
    await handler(c)
  }
  return compose<Ctx>([...mws, terminal])
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function createRouter(): Router {
  const root = makeNode()

  /**
   * Walk the trie for the given segments.
   *
   * Returns the node and its captured params on success, null on failure.
   * Params are accumulated on the way UP, not the way DOWN — because when we
   * backtrack out of a static branch into a param branch, we mustn't leak
   * params from the abandoned branch.
   *
   * Static wins over param. Always. If a static branch dead-ends, we backtrack
   * and try the param branch.
   */
  function walk(
    node: TrieNode,
    segments: string[],
    i: number,
  ): { node: TrieNode; params: Record<string, string> } | null {
    // Base case: consumed all segments. This node is the match.
    if (i === segments.length) return { node, params: {} }

    const seg = segments[i]!

    // 1) Try static. Higher priority.
    const staticChild = node.static.get(seg)
    if (staticChild) {
      const result = walk(staticChild, segments, i + 1)
      if (result) return result
      // static dead-ended; fall through to param
    }

    // 2) Try param. Captures this segment.
    if (node.param) {
      const result = walk(node.param.node, segments, i + 1)
      if (result) {
        // Merge this param into the params returned from downstream.
        // Building fresh object per level avoids backtracking bugs.
        return {
          node: result.node,
          params: { ...result.params, [node.param.name]: seg },
        }
      }
    }

    return null
  }

  function add(method: Method, path: string, chain: RouteChain): void {
    const segments = splitPath(path)
    let node = root

    for (const seg of segments) {
      if (seg.startsWith(':')) {
        const name = seg.slice(1)
        if (!node.param) {
          node.param = { name, node: makeNode() }
        } else if (node.param.name !== name) {
          // Two routes with different param names at the same position
          // (e.g. '/u/:id' and '/u/:slug') would be ambiguous. Real
          // routers reject this. For now we keep the first and move on.
        }
        node = node.param.node
      } else {
        let child = node.static.get(seg)
        if (!child) {
          child = makeNode()
          node.static.set(seg, child)
        }
        node = child
      }
    }

    node.routes.set(method, toRunnable(chain))
  }

  function match(method: string, path: string): Match | null {
    const segments = splitPath(path)
    const result = walk(root, segments, 0)
    if (!result) return null
    const run = result.node.routes.get(method as Method)
    if (!run) return null
    return { run, params: result.params }
  }

  function allowedMethods(path: string): Method[] {
    const segments = splitPath(path)
    const result = walk(root, segments, 0)
    if (!result) return []
    return [...result.node.routes.keys()]
  }

  return { add, match, allowedMethods }
}