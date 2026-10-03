#!/usr/bin/env node
const [, , command, ...args] = process.argv

const commands: Record<string, (args: string[]) => Promise<void>> = {
  async dev() {
    console.log('[mini] dev: not implemented yet')
  },
  async build() {
    console.log('[mini] build: not implemented yet')
  },
  async start() {
    console.log('[mini] start: not implemented yet')
  },
}

const run = commands[command ?? '']
if (!run) {
  console.error(`Unknown command: ${command ?? '(none)'}`)
  console.error(`Usage: mini <dev|build|start>`)
  process.exit(1)
}
await run(args)
