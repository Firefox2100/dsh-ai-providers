import { defineConfig } from 'tsdown'

// A library for plugin authors: plain ESM with declarations. The Cordis types it augments stay external.
export default defineConfig({
  entry: { index: 'src/index.ts', slots: 'src/slots.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  dts: true,
  clean: true,
  sourcemap: true,
  fixedExtension: false,
  deps: { neverBundle: specifier => specifier.startsWith('@deepseek-ai/') },
})
