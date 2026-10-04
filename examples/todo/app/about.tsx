import { h } from 'mini'

export default function About() {
  return h('div', {}, h('h1', {}, 'About'), h('a', { href: '/' }, 'home'))
}
