// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { h } from '../src/runtime/vnode.js'
import { hydrate } from '../src/runtime/hydrate.js'

/** Build a container div with a fixed innerHTML, ready to hydrate into. */
function container(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('hydrate', () => {
  it('attaches a click listener', () => {
    const dom = container('<button>click</button>')
    const fn = vi.fn()

    hydrate(h('button', { onClick: fn }, 'click'), dom.firstChild!)

    ;(dom.querySelector('button') as HTMLButtonElement).click()
    expect(fn).toHaveBeenCalledOnce()
  })

  it('recurses into children and wires each handler separately', () => {
    const dom = container('<div><button>a</button><button>b</button></div>')
    const fnA = vi.fn()
    const fnB = vi.fn()

    const tree = h(
      'div',
      {},
      h('button', { onClick: fnA }, 'a'),
      h('button', { onClick: fnB }, 'b'),
    )

    hydrate(tree, dom.firstChild!)

    ;(dom.querySelectorAll('button')[1] as HTMLButtonElement).click()
    expect(fnA).not.toHaveBeenCalled()
    expect(fnB).toHaveBeenCalledOnce()
  })

  it('runs components against existing DOM', () => {
    const dom = container('<span>hi</span>')
    const Widget = () => h('span', {}, 'hi')

    // Should not throw — the VNode produced by Widget matches the DOM.
    hydrate(h(Widget, {}), dom.firstChild!)
    expect(dom.innerHTML).toBe('<span>hi</span>')
  })

  it('does not modify the DOM structure', () => {
    const dom = container('<div><h1>a</h1><p>b</p></div>')
    const before = dom.innerHTML

    hydrate(h('div', {}, h('h1', {}, 'a'), h('p', {}, 'b')), dom.firstChild!)

    // The test: we only attach events. The DOM shape is unchanged.
    expect(dom.innerHTML).toBe(before)
  })

  it('throws on a hydration mismatch', () => {
    // Server sent one child, client tree has two.
    const dom = container('<div><span>a</span></div>')
    const tree = h('div', {}, h('span', {}, 'a'), h('span', {}, 'b'))

    expect(() => hydrate(tree, dom.firstChild!)).toThrow(/mismatch/i)
  })

  it('does nothing for text-only content', () => {
    const dom = container('hello')
    hydrate('hello', dom)
    expect(dom.innerHTML).toBe('hello')
  })
})
