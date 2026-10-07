import { defineConfig } from 'mini'
import { todoPlugin } from './plugins/todo.js'

export default defineConfig({
  routesDir: './app',
  outDir: './dist',
  port: 3000,
  plugins: [todoPlugin()],
})
