import { signal } from 'mini'

// Signals live at MODULE scope, not inside the component.
// If they were inside, every re-render would create a fresh signal
// and lose the previous value.
const [count, setCount] = signal(0)

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
