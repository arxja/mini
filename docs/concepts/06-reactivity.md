# 06 — Reactivity

## The problem

Phase 4c got us to "click handler fires." But nothing on the page
changes. Clicking a counter button logs and stops. We need: state
changes → DOM updates.

## Two primitives

    signal<T>(init) -> readonly [() => T, (v: T) => void]
    effect(fn)      -> () => void

    const [count, setCount] = signal(0)
    effect(() => console.log(count()))
    setCount(1)   // logs 1 automatically

That's the whole reactive model.

## How they talk to each other

One module-level variable, `activeEffect`:

    effect(fn) runs
      -> activeEffect = wrapper
      -> fn() runs
         -> reads count()
            -> count's getter sees activeEffect, subscribes it
      -> activeEffect = null

    setCount(5)
      -> count's setter runs every subscriber
         -> wrapper() -> fn() again -> new value

No Proxy, no observables, no dependency arrays. One global variable
and two Set operations.

### Why no Proxy (yet)

Vue uses Proxy to intercept property access. We don't need it because
we don't have nested objects — signals are top-level values. If we
later want `state.user.name` reactivity, we'd wrap objects in a Proxy
that subscribes on any property read.

## render(vnode, container)

Replace, don't diff:

    1. Clear container
    2. mount(vnode, container)  -- build real DOM from VNode tree
    3. hydrate(vnode, container) -- attach events

Correct but heavy: loses DOM state (focus, scroll, input values).
Real frameworks diff old VNode vs new to patch only the changed
parts. That's an optimization for later.

## The client loop

The bundle entry wraps the root component in an effect:

    let first = true
    effect(() => {
      const tree = Component(payload)
      if (first) {
        hydrate(tree, root)   // attach to SSR HTML
        first = false
      } else {
        render(tree, root)    // state changed; replace + re-hydrate
      }
    })

First run: SSR HTML already exists, just attach events.
Subsequent runs: signal changed, rebuild the tree.

## Signals live at module scope

If a signal is declared inside a component, every re-render creates a
new signal and loses the previous value. Signals must live outside.

    const [count, setCount] = signal(0)   // module scope
    export default function Home() {
      return <button onClick={() => setCount(count() + 1)}>{count()}</button>
    }

## The adjacent-text trap

    <button>count: {n}</button>

compiles to a vnode with TWO children: the string "count: " and the
number n. But the DOM concatenates adjacent text into a single text
node. So hydration sees 2 vnodes vs 1 DOM node — mismatch.

Fix in h(): normalizeChildren merges adjacent strings/numbers and
drops null/undefined/false. VNode child count now matches DOM child
count for the common "text + expression" case.

React solves this with `<!-- -->` comment markers between adjacent
text nodes. We solve it at build time. Fewer concepts, works for our
scope.

## Server / client entry compromise (Phase 4d)

`src/index.ts` (server entry) re-exports the client-safe surface
(h, signal, effect, render) so TypeScript type-checks page files
against a single `'mini'` specifier. At bundle time, esbuild's alias
redirects `'mini'` to `src/runtime/index.ts` (client entry).

The two entries must be kept in sync manually. If they diverge:

- Client entry has more -> esbuild bundles fine, TS errors
- Server entry has more -> TS fine, browser gets undefined

Real frameworks avoid this by making the base import client-safe and
putting server-only code behind a subpath (next/server,
react-dom/server). We do the inverse as a temporary compromise. Fix
in Phase 6: restructure package.json exports.

## What's still missing

- Fine-grained reactivity (Vue-like): track which effect reads which
  signal, update only what changed.
- Per-instance signals: two <Counter /> in the same page share one
  count. Real signal frameworks scope signals to component instances.
- Diffing in render: replace-and-rebuild loses DOM state.
- Batching: multiple setCount calls in one tick trigger multiple
  renders. Real frameworks batch.
