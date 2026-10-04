// What a Component returns. A plain object describing one element of UI.
export type VNode = {
  type: string | Component
  props: Record<string, unknown>
  children: Child[]
}

// What can appear inside a VNode.
export type Child = VNode | string | number | null | undefined | Child[] | boolean
export type Component = (props: Record<string, unknown>) => Child

// Helper to build a VNode without JSX.
//   h('h1', { class: 'title' }, 'hello')
//   => { type: 'h1', props: { class: 'title' }, children: ['hello'] }
export function h(
  type: VNode['type'],
  props: Record<string, unknown> | null,
  ...children: Child[]
): VNode {
  return { type, props: props ?? {}, children }
}
