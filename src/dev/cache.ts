/**
 * Shared bundle cache. The middleware fills it; the watcher empties it.
 * Lifting it into its own module keeps the two from importing each other.
 */
export interface BundleCache {
  get(key: string): string | undefined
  set(key: string, value: string): void
  invalidateAll(): void
}

export function createBundleCache(): BundleCache {
  const map = new Map<string, string>()
  return {
    get: (k) => map.get(k),
    set: (k, v) => void map.set(k, v),
    invalidateAll: () => map.clear(),
  }
}
