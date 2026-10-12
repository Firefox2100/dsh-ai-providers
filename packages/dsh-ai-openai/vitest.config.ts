import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@dsh-ai-providers/openai-compatible/config', replacement: fileURLToPath(new URL('../dsh-ai-openai-compatible/src/config.ts', import.meta.url)) },
      { find: '@dsh-ai-providers/openai-compatible', replacement: fileURLToPath(new URL('../dsh-ai-openai-compatible/src/index.ts', import.meta.url)) },
      { find: '@dsh-ai-providers/core', replacement: fileURLToPath(new URL('../dsh-ai-core/src/index.ts', import.meta.url)) },
      { find: '@dsh-ai-providers/runtime', replacement: fileURLToPath(new URL('../dsh-ai-providers/src/index.ts', import.meta.url)) },
    ],
  },
})
