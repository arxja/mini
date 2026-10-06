// What a Component returns. A plain object describing one element of UI.
export type VNode = {
  type: string | Component
  props: Record<string, unknown>
  children: Child[]
}

// What can appear inside a VNode.
export type Child = VNode | string | number | null | undefined | Child[] | boolean
export type Component = (props: Record<string, unknown>) => Child

/**
 * Normalize a list of children.
 *
 * Two jobs:
 *  1. Drop null/undefined/false — they render to nothing, so they
 *     shouldn't count as children.
 *  2. Merge adjacent strings/numbers into one string.
 *
 * Without #2, `<button>count: {n}</button>` produces two text children
 * in the vnode but one text node in the DOM — hydration mismatch.
 */
function normalizeChildren(children: Child[]): Child[] {
  const out: Child[] = []
  let buffer = ''
  const flush = () => {
    if (buffer) {
      out.push(buffer)
      buffer = ''
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue
    if (typeof child === 'string' || typeof child === 'number') {
      buffer += String(child)
      continue
    }
    flush()
    out.push(child)
  }
  flush()
  return out
}

// Helper to build a VNode without JSX.
//   h('h1', { class: 'title' }, 'hello')
//   => { type: 'h1', props: { class: 'title' }, children: ['hello'] }
export function h(
  type: VNode['type'],
  props: Record<string, unknown> | null,
  ...children: Child[]
): VNode {
  return { type, props: props ?? {}, children: normalizeChildren(children) }
}
