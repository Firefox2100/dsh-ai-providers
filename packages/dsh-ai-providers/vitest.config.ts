import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // The core library is built before it is published; tests read it from source.
    alias: { 'dsh-ai-core': fileURLToPath(new URL('../dsh-ai-core/src/index.ts', import.meta.url)) },
  },
})
