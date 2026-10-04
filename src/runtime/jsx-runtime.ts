import { h, type Child, type VNode } from './vnode.js'

export function jsx(type: VNode['type'], props: Record<string, unknown>): VNode {
  const { children, ...rest } = props
  return h(type, rest, children as Child)
}

export function jsxs(type: VNode['type'], props: Record<string, unknown>): VNode {
  const { children, ...rest } = props
  return h(type, rest, ...(Array.isArray(children) ? children : [children as Child]))
}

export const Fragment = (props: { children?: Child }): Child => props.children ?? null

// ---------------------------------------------------------------------------
// The JSX namespace.
//
// With `jsx: "react-jsx"` and `jsxImportSource: "mini"`, TypeScript looks for
// a `JSX` namespace exported from `mini/jsx-runtime`. This is where tag names,
// allowed prop shapes, and the children-prop name are declared.
//
// React ships this in @types/react. We ship it here.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-namespace -- TS JSX runtime contract; a namespace is the only form the compiler recognizes.
export namespace JSX {
  export type Element = VNode
  export interface IntrinsicElements {
    [tag: string]: Record<string, unknown> & { children?: Child }
  }
  export interface ElementChildrenAttribute {
    children: Record<string, never>
  }
}
