import { describe, it, expect } from 'vitest'
import { createApp } from '../src/http/app.js'
import { makeCtx } from './helpers.js'

describe('SSE events', () => {
  it('404s for other /_mini/ paths', async () => {
    const app = createApp()
    const { eventsMiddleware } = await import('../src/dev/events.js')
    app.use(eventsMiddleware())
    const { ctx, res } = makeCtx('GET', '/_mini/other')
    await app.handle(ctx)
    expect(res.statusCode).toBe(404)
  })
})
