import { watch } from 'node:fs'

export interface Watcher {
  close(): void
}

/**
 * Watch a directory recursively. Debounce bursts (editors often fire
 * multiple events per save).
 */
export function watchDir(dir: string, onChange: (file: string) => void, debounceMs = 80): Watcher {
  const pending = new Set<string>()
  let timer: NodeJS.Timeout | null = null

  const flush = (): void => {
    timer = null
    const files = [...pending]
    pending.clear()
    for (const f of files) onChange(f)
  }

  const watcher = watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename) return
    pending.add(filename)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, debounceMs)
  })

  return {
    close: () => {
      watcher.close()
      if (timer) clearTimeout(timer)
    },
  }
}
