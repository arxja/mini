import type { Plugin } from 'mini'

export function todoPlugin(): Plugin {
  return {
    name: 'todo:tracker',

    configResolved(config) {
      console.log(`[todo] mode=${config.mode} routesDir=${config.routesDir}`)
    },

    onRoute(route) {
      console.log(`[todo] route discovered: ${route.method} ${route.pattern}`)
      return route
    },

    buildEnd({ manifest, outDir }) {
      const pages = Object.keys(manifest.pages)
      console.log(`[todo] built ${pages.length} page(s) -> ${outDir}`)
      for (const p of pages) console.log(`[todo]   ${p} -> ${manifest.pages[p]}`)
    },
  }
}
