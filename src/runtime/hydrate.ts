import type { Child, Component, VNode } from './vnode.js'

/**
 * Hydrate a VNode tree against an existing DOM container.
 *
 * Mirrors React's `hydrateRoot(container, element)`: `element` is
 * expected to already exist inside `container`. We walk container's
 * children in lockstep with the vnode tree and attach event listeners.
 * We never create, move, or remove DOM nodes.
 *
 * Throws on a shape mismatch.
 */
export function hydrate(vnode: Child, container: Node): void {
  hydrateList(Array.isArray(vnode) ? vnode : [vnode], container.childNodes)
}

function hydrateList(vnodes: readonly Child[], domChildren: NodeListOf<ChildNode>): void {
  let domIndex = 0
  for (const vnode of vnodes) {
    if (vnode == null || vnode === false) continue
    const dom = domChildren[domIndex]
    if (!dom) {
      throw new Error(`Hydration mismatch: VNode has more children than DOM (at index ${domIndex})`)
    }
    hydrateNode(vnode, dom)
    domIndex++
  }
}

function hydrateNode(vnode: Child, dom: Node): void {
  if (vnode == null || vnode === false) return
  if (typeof vnode === 'string' || typeof vnode === 'number') return

  const v = vnode as VNode

  // Component: call it, hydrate the result against the same DOM node.
  if (typeof v.type === 'function') {
    hydrateNode((v.type as Component)(v.props), dom)
    return
  }

  // Element: attach events, recurse into children.
  const el = dom as Element

  for (const [key, value] of Object.entries(v.props)) {
    if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener)
    }
  }

  hydrateList(v.children, el.childNodes)
}
