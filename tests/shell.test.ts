import { describe, it, expect } from 'vitest'
import { h } from '../src/runtime/vnode.js'
import { renderShell } from '../src/runtime/html-shell.js'

describe('renderShell', () => {
  it('wraps content in a full HTML document', () => {
    const html = renderShell(h('h1', {}, 'hi'))
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<div id="root"><h1>hi</h1></div>')
  })

  it('embeds the payload', () => {
    const html = renderShell('x', { payload: { id: '42' } })
    expect(html).toContain('window.__MINI_PAYLOAD__ = {"id":"42"}')
  })

  it('adds the client bundle script when bundleUrl is given', () => {
    const html = renderShell('x', { bundleUrl: '/assets/index.js' })
    expect(html).toContain('type="module"')
    expect(html).toContain('src="/assets/index.js"')
  })

  it('escapes < in the payload (JSON-in-HTML guard)', () => {
    const html = renderShell('x', {
      payload: { evil: '</script><script>alert(1)</script>' },
    })
    expect(html).not.toContain('</script><script>')
    expect(html).toContain('\\u003c')
  })
})
