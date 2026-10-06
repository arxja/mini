import { describe, it, expect, vi } from 'vitest'
import { signal, effect } from '../src/runtime/signal.js'

describe('signal', () => {
  it('reads and writes', () => {
    const [count, setCount] = signal(0)
    expect(count()).toBe(0)
    setCount(5)
    expect(count()).toBe(5)
  })

  it('notifies effects on change', () => {
    const [count, setCount] = signal(0)
    const spy = vi.fn()
    effect(() => {
      spy(count())
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenLastCalledWith(0)

    setCount(1)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith(1)
  })

  it('does not notify when value is unchanged', () => {
    const [count, setCount] = signal(0)
    const spy = vi.fn()
    effect(() => spy(count()))
    setCount(0) // same value
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
