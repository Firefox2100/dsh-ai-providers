import { defineConfig, type UserConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const host: UserConfig = {
  entry: { index: 'src/index.ts' }, outDir: 'lib', format: 'esm', platform: 'node', target: 'es2024', dts: false, clean: true, sourcemap: true, fixedExtension: false,
  deps: { neverBundle: specifier => specifier.startsWith('@deepseek-ai/') || specifier === 'dsh-ai-core' || specifier === 'dsh-ai-openai' },
}
const shared = new Set(['react', 'react/jsx-runtime', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-slots'])
const client: UserConfig = {
  entry: { client: 'src/client/index.ts' }, outDir: 'lib', format: 'cjs', platform: 'browser', target: 'es2024', dts: false, clean: false, sourcemap: true, fixedExtension: false,
  deps: { neverBundle: specifier => shared.has(specifier), alwaysBundle: specifier => !shared.has(specifier) },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
  outputOptions: { entryFileNames: 'client.js', banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {`, intro: 'var module = { exports: {} }; var exports = module.exports;', footer: 'return module.exports; } });' },
}
export default defineConfig([host, client])
