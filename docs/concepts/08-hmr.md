# 08 — HMR (state-preserving reload)

## The goal

Edit a page file. Browser reloads. State survives. Counter stays at 5.

## The core idea

State survives a reload only if it has a **stable name**.

Signals are anonymous by default. Give them a key:

    const [count, setCount] = signal(0, 'home-counter')

Now the runtime can snapshot `{ 'home-counter': 5 }` before reload,
and restore it after.

## The flow

1. Watcher fires on file change.
2. Server: invalidate cache, re-walk routes, `broadcast('hmr')`.
3. Client SSE handler: `_collectSignals()` -> JSON -> sessionStorage.
4. Client: `location.reload()`.
5. Server sends fresh HTML + fresh bundle.
6. Client entry, BEFORE importing the page module, reads the
   snapshot and calls `_setRestoreData(snapshot)`.
7. Page module runs. `signal(0, 'home-counter')` sees the restore
   data, uses 5 instead of 0.
8. Mount succeeds. Snapshot cleared so a hard-reload starts clean.

## The dynamic import trick

ESM static imports are hoisted and evaluated before the importing
module's body. So this **doesn't work**:

    import { _setRestoreData } from './signal.ts'
    _setRestoreData(snapshot)              // runs AFTER page module
    import Component from './page.tsx'     // hoisted above

The page module's `signal(0, 'home-counter')` would run before
`_setRestoreData` did, and see no restore data.

Fix: dynamic import.

    import { _setRestoreData } from './signal.ts'
    _setRestoreData(snapshot)              // runs first
    const { default: Component } = await import('./page.tsx')

Top-level `await` in an ESM script. Requires target es2022 in
esbuild (or older browsers won't parse it — hence the target bump).

## What survives, what doesn't

Survives:

- Keyed signal values (numbers, strings, bools, arrays, plain objects)
- Anything JSON-serializable

Doesn't survive:

- Unkeyed signals (anonymous)
- DOM state: scroll, focus, selection, unsubmitted input
- Functions, Dates, Maps, Sets — anything not JSON

For DOM state preservation you need true module HMR (no reload at
all). That's a Phase 5 concern.

## Why this is "HMR" and not strictly "hot module replacement"

Strictly: HMR = swap one module's code, keep the running runtime.
We reload the runtime. So it's state-preserving reload.

Practically: the user experience is the same. Edit code, state
survives. Vue's module-scope reactive state actually gets _lost_ on
HMR; ours is explicit and preserved.

## The identity lesson

**State that survives anything must have identity.**

- Files -> paths
- DOM elements -> ids
- Signals -> keys
- Cache entries -> URLs
- Sessions -> tokens

Every persistence mechanism is a naming mechanism in disguise.
React Fast Refresh infers the name (position + hook order). We
make it explicit. Same idea, different visibility.

## What's still missing

- True module HMR (browser-native ESM, no reload)
- DOM state preservation (scroll, focus, selection)
- Server-side code HMR (editing src/ still requires restart)
- Multi-file graph (edit a shared utility -> which pages refresh?)
