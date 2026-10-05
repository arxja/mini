// Client-safe public API. Bundled into the browser.
// NO imports from node:* and nothing from src/http/.

export { h, type VNode, type Component, type Child } from './vnode.js'
export { hydrate } from './hydrate.js'
