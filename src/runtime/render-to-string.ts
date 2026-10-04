import type { Child, Component, VNode } from './vnode.js'

/** Turn any Child into HTML text. */
export function renderToString(child: Child): string {
  // null / undefined / false -> nothing
  if (child == null || child === false) return ''

  // strings and numbers -> their text
  if (typeof child === 'string' || typeof child === 'number') {
    return escapeHtml(String(child))
  }

  // arrays -> render each and join
  if (Array.isArray(child)) {
    return child.map(renderToString).join('')
  }

  // Now we have a VNode.
  const vnode = child as VNode

  // If type is a function, it's a Component. Call it and render the result.
  if (typeof vnode.type === 'function') {
    const result = (vnode.type as Component)(vnode.props)
    return renderToString(result)
  }

  // Otherwise it's a tag name like 'div', 'h1', 'button'.
  const tag = vnode.type
  const attrs = renderProps(vnode.props)
  const inner = vnode.children.map(renderToString).join('')

  return `<${tag}${attrs}>${inner}</${tag}>`
}

/** Turn props into an HTML attribute string. Skips events. */
function renderProps(props: Record<string, unknown>): string {
  let out = ''
  for (const [key, value] of Object.entries(props)) {
    // Event handlers: props like onClick, onInput. Can't serialize a
    // function to HTML, so we drop them here. Hydration reattaches them.
    if (/^on[A-Z]/.test(key)) continue
    if (value == null || value === false) continue

    const name = key === 'className' ? 'class' : key
    if (value === true) {
      out += ` ${name}`
    } else {
      out += ` ${name}="${escapeHtml(String(value))}"`
    }
  }
  return out
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
