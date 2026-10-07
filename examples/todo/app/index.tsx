import { signal } from 'mini'

// The key preserves this signal across HMR reloads.
const [count, setCount] = signal(0, 'home-counter')

export default function Home() {
  return (
    <div>
      <h1>Todo</h1>
      <button onClick={() => setCount(count() + 1)}>count: {count()}</button>
      <ul>
        <li>learn compose</li>
        <li>learn trie</li>
      </ul>
    </div>
  )
}
