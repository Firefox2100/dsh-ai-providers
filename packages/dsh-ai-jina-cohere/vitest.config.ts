import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'dsh-ai-core': fileURLToPath(new URL('../dsh-ai-core/src/index.ts', import.meta.url)),
      'dsh-ai-providers': fileURLToPath(new URL('../dsh-ai-providers/src/index.ts', import.meta.url)),
    },
  },
})
