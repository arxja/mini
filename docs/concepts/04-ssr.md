# 04 — Server-side rendering (piece 1: render only)

## What SSR is (and isn't)

Right now: SSR means "the server sends HTML built from a component."
Later: SSR will also mean "the client attaches to that HTML."

For today, one thing only: turn a VNode tree into an HTML string.

## VNode

    { type: 'div', props: {}, children: [...] }

A plain object. Nothing magic. `h()` is a convenience builder.
`type` is either a tag name (string) or a Component (function).

## Component

A function that returns a VNode, string, number, or null.
Components nest freely: `h(Widget, { name: 'sam' })`.

## renderToString

Recursive. Rules:

- null / undefined / false -> ''
- string / number -> escaped text
- array -> render each, join
- VNode with function type -> call it, render result
- VNode with string type -> `<tag attrs>children</tag>`

## Two security rules baked in

1. Text content is escaped (`& < > "`). Without this, a user typing
   `<script>` into a form ships an XSS payload to every visitor.
2. Attribute values are escaped too. Attribute injection is a real
   attack class (`<a title='"evil"'>`).

Both happen inside `renderToString`. Every framework has these. Never
skip them.

## Events on the server

`onClick`, `onInput`, etc. are stripped from the output. Functions
can't be serialized to HTML. Later, hydration will reattach them from
the client's tree.

## File convention

- `.ts` -> API route. Named method exports (GET, POST, ...).
- `.tsx` -> Page. Default export is a Component.
- `_` and `.` prefixed files ignored.

Same walker. Same trie. Different handler kind.

## Shell

A page is a full HTML document. `renderShell` provides
`<!doctype html>`, `<head>`, `<body>`, and a `<div id="root">`
container. Later this is where the payload script and client runtime
go.

## Phase 4b — hydration

### What hydration is

The server sent HTML. The browser shows it. Now the buttons need to
work. Hydration is: run the same component in the browser, get the
same VNode tree, walk it in parallel with the DOM, attach events.

### What hydration is NOT

- Not "re-render everything." We don't create new DOM.
- Not "diff the server tree against a client tree." There is only one
  client tree, and it must match the server DOM.

### The walk

    hydrate(vnode, dom):
      null/false         -> nothing
      string/number      -> nothing (text already exists)
      array              -> walk DOM children in lockstep
      Component          -> call it, hydrate result against same DOM
      Element            -> attach events from props, recurse into
                            children against el.childNodes

### Events

Only props matching /^on[A-Z]/ become listeners. The event name is
key.slice(2).toLowerCase(): onClick -> click, onInput -> input.

Events are the ONLY thing hydration does. Props like class, href,
text content — all already in the DOM from SSR. Hydration doesn't
touch them. That's why it's cheap.

### Mismatch

If VNode.children.length > DOM.childNodes.length at any node, we throw.
Real React warns and re-renders the subtree client-side. We don't —
loud failure beats silent corruption, and the lesson is the same.

The three ways to cause a mismatch:

1. Non-deterministic content (Date.now, Math.random)
2. Reading browser-only state during render (window.innerWidth)
3. Client and server seeing different data (state not in payload)

### JSX runtime

With "jsx": "react-jsx" and "jsxImportSource": "mini", TypeScript
rewrites <div>hi</div> to jsx('div', { children: 'hi' }) imported from
'mini/jsx-runtime'. Our jsx/jsxs forward to h(). This is how every
framework does it — JSX is a syntax, not a runtime.

### Still missing

- Client bundle delivery (how does the browser get the component code?)
- Signals and re-rendering (piece 4c)
- Server-sent runtime script
