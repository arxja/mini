import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { createApp } from '../src/http/app.js'
import { makeCtx } from './helpers.js'

describe('file-based routing end-to-end', () => {
  it('serves / and /users/:id from disk', async () => {
    const app = createApp()
    await app.routes(join(import.meta.dirname, 'fixtures/routes'))

    const r1 = makeCtx('GET', '/')
    await app.handle(r1.ctx)
    expect(r1.res.body).toBe('hi')

    const r2 = makeCtx('GET', '/users/42')
    await app.handle(r2.ctx)
    expect(r2.res.body).toBe('42')
  })

  it('multiple methods on one file', async () => {
    const app = createApp()
    await app.routes(join(import.meta.dirname, 'fixtures/routes'))

    const get = makeCtx('GET', '/hello')
    await app.handle(get.ctx)
    expect(get.res.body).toBe('hi')

    const post = makeCtx('POST', '/hello')
    await app.handle(post.ctx)
    expect(post.res.body).toBe('posted')
  })

  it('405 for a method the file does not export', async () => {
    const app = createApp()
    await app.routes(join(import.meta.dirname, 'fixtures/routes'))

    const r = makeCtx('DELETE', '/hello')
    await app.handle(r.ctx)
    expect(r.res.statusCode).toBe(405)
    expect(r.res.headers.get('allow')).toContain('GET')
    expect(r.res.headers.get('allow')).toContain('POST')
  })

  it('renders .tsx page to full HTML shell', async () => {
    const app = createApp()
    await app.routes(join(import.meta.dirname, 'fixtures/routes'))

    const r = makeCtx('GET', '/page')
    await app.handle(r.ctx)

    expect(r.res.headers.get('content-type')).toContain('text/html')
    expect(r.res.body).toContain('<!doctype html>')
    expect(r.res.body).toContain('<div id="root"><h1>from a page</h1></div>')
  })
})
