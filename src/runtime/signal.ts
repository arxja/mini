type Subscriber = () => void

// The one piece of "magic": a variable holding the effect currently
// running. Signal getters look at it to know who to subscribe.
let activeEffect: Subscriber | null = null

export function signal<T>(initial: T): readonly [() => T, (v: T) => void] {
  let value = initial
  const subscribers = new Set<Subscriber>()

  const get = (): T => {
    if (activeEffect) subscribers.add(activeEffect)
    return value
  }

  const set = (next: T): void => {
    // Object.is handles NaN and -0 vs 0 the way you'd want.
    if (Object.is(next, value)) return
    value = next
    // Snapshot in case a subscriber unsubscribes mid-iteration.
    for (const sub of [...subscribers]) sub()
  }

  return [get, set] as const
}

export function effect(fn: () => void): () => void {
  let disposed = false

  const wrapper = (): void => {
    if (disposed) return
    const prev = activeEffect
    activeEffect = wrapper
    try {
      fn()
    } finally {
      activeEffect = prev
    }
  }

  wrapper()

  return () => {
    disposed = true
  }
}
