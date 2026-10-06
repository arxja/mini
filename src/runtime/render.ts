import { hydrate } from './hydrate.js'
import type { Child, Component, VNode } from './vnode.js'

/** Build real DOM from a VNode tree and append it to `parent`. */
function mount(vnode: Child, parent: Node): void {
  if (vnode == null || vnode === false) return
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    parent.appendChild(document.createTextNode(String(vnode)))
    return
  }
  if (Array.isArray(vnode)) {
    for (const child of vnode) mount(child, parent)
    return
  }

  const v = vnode as VNode

  if (typeof v.type === 'function') {
    mount((v.type as Component)(v.props), parent)
    return
  }

  const el = document.createElement(v.type)

  for (const [key, value] of Object.entries(v.props)) {
    if (/^on[A-Z]/.test(key)) continue // events attached by hydrate
    if (value == null || value === false) continue
    const name = key === 'className' ? 'class' : key
    if (value === true) el.setAttribute(name, '')
    else el.setAttribute(name, String(value))
  }

  for (const child of v.children) mount(child, el)
  parent.appendChild(el)
}

/**
 * Replace `container`'s content with the DOM produced by `vnode`, then
 * hydrate it so event listeners from `vnode` get attached.
 */
export function render(vnode: Child, container: Node): void {
  while (container.firstChild) container.removeChild(container.firstChild)
  mount(vnode, container)
  hydrate(vnode, container)
}
