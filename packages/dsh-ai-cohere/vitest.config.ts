import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@dsh-ai-providers/jina-cohere', replacement: fileURLToPath(new URL('../dsh-ai-jina-cohere/src/index.ts', import.meta.url)) },
      { find: '@dsh-ai-providers/core', replacement: fileURLToPath(new URL('../dsh-ai-core/src/index.ts', import.meta.url)) },
      { find: '@dsh-ai-providers/runtime', replacement: fileURLToPath(new URL('../dsh-ai-providers/src/index.ts', import.meta.url)) },
    ],
  },
})
