import {defineConfig, type UserConfig} from 'tsdown'
import pkg from './package.json' with {type: 'json'}

const shared = new Set(['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-primitives'])
const host: UserConfig = {
  name: `${pkg.name}/host`, entry: {index: 'src/index.ts'}, outDir: 'lib', format: 'esm', platform: 'node', target: 'es2024', dts: false, clean: false, sourcemap: true, fixedExtension: false,
  deps: {neverBundle: specifier => specifier.startsWith('@deepseek-ai/') || specifier === '@dsh-ai-providers/core'},
}
const client: UserConfig = {
  name: `${pkg.name}/client`, entry: {client: 'src/client/index.ts'}, outDir: 'lib', format: 'cjs', platform: 'browser', target: 'es2024', dts: false, clean: false, sourcemap: true, fixedExtension: false,
  deps: {neverBundle: specifier => shared.has(specifier), alwaysBundle: specifier => !shared.has(specifier)},
  define: {'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production')},
  outputOptions: {entryFileNames: 'client.js', sourcemapExcludeSources: false, banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {`, intro: 'var module = { exports: {} }; var exports = module.exports;', footer: 'return module.exports; } });'},
}
export default defineConfig([host, client])
