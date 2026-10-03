export type NextFn = () => Promise<void>
export type Middleware<C> = (ctx: C, next: NextFn) => Promise<void>

export function compose<C>(middlewares: Middleware<C>[]): (ctx: C) => Promise<void> {
  return async function run(ctx: C): Promise<void> {
    // High-water mark. Records the deepest slot we've entered.
    // Each call to run() gets its own — no shared state between requests.
    let index = -1

    async function dispatch(i: number): Promise<void> {
      if (i <= index) throw new Error('next() called multiple times')
      index = i

      const fn = middlewares[i]
      if (!fn) return

      await fn(ctx, () => dispatch(i + 1))
    }

    await dispatch(0)
  }
}
