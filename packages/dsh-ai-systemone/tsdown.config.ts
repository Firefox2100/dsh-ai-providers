import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: true,
  sourcemap: true,
  fixedExtension: false,
  deps: { neverBundle: specifier => specifier.startsWith('@deepseek-ai/') || specifier === '@dsh-ai-providers/core' },
})
