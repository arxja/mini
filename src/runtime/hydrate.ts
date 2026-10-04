import type { Child, Component, VNode } from './vnode.js'

/**
 * Attach event listeners from a VNode tree to an existing DOM tree.
 *
 * The DOM is already rendered (server sent it). We do NOT create
 * elements. We walk the VNode tree and the DOM tree in parallel and,
 * wherever we see an `onX` prop, we call addEventListener on the
 * matching DOM node.
 *
 * Precondition: the VNode tree and DOM tree have the same shape.
 * If they don't (a "hydration mismatch"), we throw — better to know
 * than to silently produce broken UI.
 */
export function hydrate(vnode: Child, dom: Node): void {
  // null / undefined / false — nothing to hydrate.
  if (vnode == null || vnode === false) return

  // Text content — the text already exists in the DOM. Nothing to do.
  if (typeof vnode === 'string' || typeof vnode === 'number') return

  // Array of children — walk DOM children in lockstep.
  if (Array.isArray(vnode)) {
    const domChildren = dom.childNodes
    for (let i = 0; i < vnode.length; i++) {
      const domChild = domChildren[i]
      if (!domChild) {
        throw new Error(
          `Hydration mismatch: VNode has ${vnode.length} children, DOM has ${domChildren.length}`,
        )
      }
      hydrate(vnode[i], domChild)
    }
    return
  }

  const v = vnode as VNode

  // Component — call it, hydrate the result against the same DOM node.
  if (typeof v.type === 'function') {
    const result = (v.type as Component)(v.props)
    hydrate(result, dom)
    return
  }

  // Element — attach events and recurse.
  const el = dom as Element

  for (const [key, value] of Object.entries(v.props)) {
    if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      // 'onClick' -> 'click', 'onInput' -> 'input'
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value as EventListener)
    }
  }

  hydrate(v.children, el)
}
