type Subscriber = () => void
type AnySignal = readonly [() => unknown, (v: unknown) => void]

// The one piece of "magic": a variable holding the effect currently
// running. Signal getters look at it to know who to subscribe.
let activeEffect: Subscriber | null = null

// Registry of keyed signals. Survives HMR snapshots.
const registry = new Map<string, AnySignal>()

// Restore data set by the client entry BEFORE the page module is imported.
// Keyed signals read from this on creation.
let restoreData: Record<string, unknown> = {}

/** @internal Used by the HMR client. */
export function _setRestoreData(data: Record<string, unknown>): void {
  restoreData = data
}

/** @internal Used by the HMR client. */
export function _collectSignals(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, [get]] of registry) {
    try {
      out[key] = get()
    } catch {
      // getter threw (e.g. unsubscribed) — skip
    }
  }
  return out
}

export function signal<T>(initial: T, key?: string): readonly [() => T, (v: T) => void] {
  // If this signal was restored from an HMR snapshot, use that value.
  if (key && key in restoreData) {
    initial = restoreData[key] as T
  }

  let value = initial
  const subscribers = new Set<Subscriber>()

  const get = (): T => {
    if (activeEffect) subscribers.add(activeEffect)
    return value
  }

  const set = (next: T): void => {
    if (Object.is(next, value)) return
    value = next
    for (const sub of [...subscribers]) sub()
  }

  if (key) registry.set(key, [get, set] as AnySignal)

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
