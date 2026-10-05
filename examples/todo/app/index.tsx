export default function Home() {
  return (
    <div>
      <h1>Todo</h1>
      <p>Try /todos (JSON) or /about</p>
      <button onClick={() => console.log('[mini] click works!')}>click me</button>
      <ul>
        <li>learn compose</li>
        <li>learn trie</li>
      </ul>
    </div>
  )
}
