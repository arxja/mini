import { describe, it, expect } from 'vitest'
import { h } from '../src/runtime/vnode.js'
import { renderToString } from '../src/runtime/render-to-string.js'

describe('renderToString', () => {
  it('renders text', () => {
    expect(renderToString('hello')).toBe('hello')
  })

  it('renders a simple element', () => {
    expect(renderToString(h('h1', {}, 'hi'))).toBe('<h1>hi</h1>')
  })

  it('renders attributes', () => {
    expect(renderToString(h('a', { href: '/x' }, 'link'))).toBe('<a href="/x">link</a>')
  })

  it('uses class not className', () => {
    expect(renderToString(h('div', { className: 'x' }, ''))).toBe('<div class="x"></div>')
  })

  it('skips event handlers', () => {
    const out = renderToString(h('button', { onClick: () => {} }, 'click'))
    expect(out).toBe('<button>click</button>')
  })

  it('renders nested children', () => {
    const tree = h('ul', {}, h('li', {}, 'a'), h('li', {}, 'b'))
    expect(renderToString(tree)).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('renders a component', () => {
    const Widget = (props: Record<string, unknown>) => h('span', {}, `hi ${props.name}`)
    expect(renderToString(h(Widget, { name: 'sam' }))).toBe('<span>hi sam</span>')
  })

  it('escapes user text (XSS guard)', () => {
    expect(renderToString('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('escapes attribute values', () => {
    const out = renderToString(h('a', { title: '"evil"' }, ''))
    expect(out).toBe('<a title="&quot;evil&quot;"></a>')
  })

  it('skips null children', () => {
    expect(renderToString(h('div', {}, null, 'x', undefined))).toBe('<div>x</div>')
  })

  it('merges adjacent text children', () => {
    expect(renderToString(h('button', {}, 'count: ', 0))).toBe('<button>count: 0</button>')
  })

  it('does not merge text around an element', () => {
    expect(renderToString(h('div', {}, 'a', h('b', {}, 'x'), 'c'))).toBe('<div>a<b>x</b>c</div>')
  })

  it('drops null/undefined/false children', () => {
    expect(renderToString(h('div', {}, 'a', null, false, 'b'))).toBe('<div>ab</div>')
  })
})
