import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { fileToPattern, loadFileRoutes } from '../src/router/files.js'

describe('fileToPattern', () => {
  it('maps index to root', () => {
    expect(fileToPattern('index.ts')).toBe('/')
  })
  it('maps flat file to segment', () => {
    expect(fileToPattern('about.ts')).toBe('/about')
  })
  it('maps nested index', () => {
    expect(fileToPattern('users/index.ts')).toBe('/users')
  })
  it('converts [name] to :name', () => {
    expect(fileToPattern('users/[id].ts')).toBe('/users/:id')
  })
  it('handles nested params', () => {
    expect(fileToPattern('users/[userId]/posts/[postId].ts')).toBe('/users/:userId/posts/:postId')
  })
})

describe('loadFileRoutes', () => {
  const dir = join(import.meta.dirname, 'fixtures/routes')

  it('discovers routes recursively', async () => {
    const routes = await loadFileRoutes(dir)
    const keys = routes.map((r) => `${r.method} ${r.pattern}`).sort()
    expect(keys).toEqual([
      'GET /',
      'GET /hello',
      'GET /users',
      'GET /users/:id',
      'GET /users/:id/posts',
      'POST /hello',
    ])
  })

  it('skips files with _ or . prefix', async () => {
    const routes = await loadFileRoutes(dir)
    const patterns = routes.map((r) => r.pattern)
    expect(patterns).not.toContain('/_ignored')
    expect(patterns).not.toContain('/.hidden')
  })

  it('skips files with no method exports', async () => {
    const routes = await loadFileRoutes(dir)
    expect(routes.find((r) => r.pattern === '/nothing')).toBeUndefined()
  })
})
