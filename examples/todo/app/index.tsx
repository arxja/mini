import { h } from 'mini'

export default function Home() {
  return h(
    'div',
    {},
    h('h1', {}, 'Todo'),
    h('p', {}, 'Try /todos (JSON) or /about'),
    h('ul', {}, h('li', {}, 'learn compose'), h('li', {}, 'learn trie')),
  )
}
