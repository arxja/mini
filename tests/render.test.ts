// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { h } from '../src/runtime/vnode.js'
import { render } from '../src/runtime/render.js'

function container(): HTMLElement {
  return document.createElement('div')
}

describe('render', () => {
  it('mounts a tree', () => {
    const dom = container()
    render(h('h1', {}, 'hi'), dom)
    expect(dom.innerHTML).toBe('<h1>hi</h1>')
  })

  it('replaces previous content', () => {
    const dom = container()
    render(h('h1', {}, 'a'), dom)
    render(h('h1', {}, 'b'), dom)
    expect(dom.innerHTML).toBe('<h1>b</h1>')
  })

  it('attaches events after mounting', () => {
    const dom = container()
    const fn = vi.fn()
    render(h('button', { onClick: fn }, 'x'), dom)
    ;(dom.querySelector('button') as HTMLButtonElement).click()
    expect(fn).toHaveBeenCalledOnce()
  })
})
