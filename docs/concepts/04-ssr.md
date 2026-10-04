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

## What's still missing

- Hydration on the client
- Signals / interactivity
- JSX (use `h()` for now)
- Bundling the client runtime
- Layouts / route groups
