import { describe, it, expect, vi } from 'vitest'
import { signal, effect, _setRestoreData } from '../src/runtime/signal.js'

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

  it('preserves keyed signal values via restore data', () => {
    _setRestoreData({ 'test-restore-1': 42 })
    const [get] = signal(0, 'test-restore-1')
    expect(get()).toBe(42)
  })

  it('ignores restore data for unkeyed signals', () => {
    _setRestoreData({ 'test-restore-2': 99 })
    const [get] = signal(0) // no key
    expect(get()).toBe(0)
  })

  it('signals without keys in restore data keep initial', () => {
    _setRestoreData({})
    const [get] = signal(7, 'test-restore-3')
    expect(get()).toBe(7)
  })
})
