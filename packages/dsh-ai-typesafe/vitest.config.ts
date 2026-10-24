import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@dsh-ai-providers/systemone': fileURLToPath(new URL('../dsh-ai-systemone/src/index.ts', import.meta.url)),
      '@dsh-ai-providers/core': fileURLToPath(new URL('../dsh-ai-core/src/index.ts', import.meta.url)),
      '@dsh-ai-providers/runtime': fileURLToPath(new URL('../dsh-ai-providers/src/index.ts', import.meta.url)),
    },
  },
})
