import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DSH_DEVELOPMENT, DSH_ENGINES, DSH_PACKAGE_PEERS } from './dsh-compat.mjs'
import { releasePackages } from './release-packages.mjs'

const root = resolve(import.meta.dirname, '..')
const names = new Set(releasePackages.map(({ name }) => name))
const workspace = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const version = workspace.version
if (typeof version !== 'string' || version.length === 0) throw new Error('workspace version is missing')

for (const { folder, name } of releasePackages) {
  const directory = resolve(root, 'packages', folder)
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
  if (manifest.name !== name) throw new Error(`${folder}: expected package name ${name}`)
  if (manifest.version !== version) throw new Error(`${name}: expected version ${version}, got ${manifest.version}`)
  if (manifest.private) throw new Error(`${name}: publishable package must not be private`)
  if (typeof manifest.description !== 'string' || manifest.description.length === 0) throw new Error(`${name}: description is missing`)
  if (manifest.author?.name !== 'Firefox2100' || manifest.author?.url !== 'https://github.com/Firefox2100') throw new Error(`${name}: author metadata is incorrect`)
  if (manifest.license !== 'GPL-3.0-only') throw new Error(`${name}: unexpected license`)
  if (manifest.publishConfig?.access !== 'public') throw new Error(`${name}: package must publish publicly`)
  if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org/') throw new Error(`${name}: npm registry is incorrect`)
  if (manifest.repository?.type !== 'git' || manifest.repository?.url !== 'git+https://github.com/Firefox2100/dsh-ai-providers.git') throw new Error(`${name}: repository metadata is incorrect`)
  if (manifest.repository?.directory !== `packages/${folder}`) throw new Error(`${name}: repository directory is incorrect`)
  if (typeof manifest.homepage !== 'string' || !manifest.homepage.startsWith('https://firefox2100.github.io/dsh-ai-providers/')) throw new Error(`${name}: documentation homepage is missing`)
  if (manifest.bugs?.url !== 'https://github.com/Firefox2100/dsh-ai-providers/issues') throw new Error(`${name}: issue tracker is incorrect`)
  if (!Array.isArray(manifest.keywords) || !manifest.keywords.includes('deepseek-harness')) throw new Error(`${name}: keywords are missing`)
  if (!Array.isArray(manifest.files) || !manifest.files.includes('README.md') || !manifest.files.includes('LICENSE')) throw new Error(`${name}: README.md and LICENSE must be included`)

  const readme = await readFile(resolve(directory, 'README.md'), 'utf8')
  if (!readme.startsWith(`# ${name}\n`)) throw new Error(`${name}: README heading must match the package name`)

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
      if (names.has(dependency) && range !== `workspace:${version}`) throw new Error(`${name}: ${field}.${dependency} must equal workspace:${version}`)
    }
  }

  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (dependency.startsWith('@deepseek-ai/')) throw new Error(`${name}: ${dependency} must be a peer dependency`)
  }

  for (const field of ['peerDependencies', 'devDependencies']) {
    for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
      if (dependency === '@deepseek-ai/dsh' && range !== DSH_ENGINES) throw new Error(`${name}: ${field}.${dependency} must be ${DSH_ENGINES}`)
      if (!dependency.startsWith('@deepseek-ai/dsh-')) continue
      const expected = field === 'peerDependencies' ? DSH_PACKAGE_PEERS : DSH_DEVELOPMENT
      if (range !== expected) throw new Error(`${name}: ${field}.${dependency} must be ${expected}`)
    }
  }
  if (manifest.dsh?.engines !== undefined) throw new Error(`${name}: DSH reads engines.dsh, not dsh.engines`)

  if (manifest.main) await access(resolve(directory, manifest.main))
  if (manifest.types) await access(resolve(directory, manifest.types))
}

await access(resolve(root, 'LICENSE'))

for (const folder of ['dsh-ai-all', 'dsh-ai-providers', 'dsh-ai-openai', 'dsh-ai-anthropic', 'dsh-ai-jina', 'dsh-ai-localai', 'dsh-ai-ollama', 'dsh-ai-cohere', 'dsh-ai-dashscope', 'dsh-ai-typesafe']) {
  const manifest = JSON.parse(await readFile(resolve(root, 'packages', folder, 'package.json'), 'utf8'))
  if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') throw new Error(`${manifest.name}: missing DSH bundle declaration`)
  if (manifest.engines?.dsh !== DSH_ENGINES) throw new Error(`${manifest.name}: engines.dsh must be ${DSH_ENGINES}`)
  if (!manifest.files.includes('cordis.patch.yml')) throw new Error(`${manifest.name}: cordis.patch.yml must be published`)
  await access(resolve(root, 'packages', folder, 'cordis.patch.yml'))
}

const standaloneBundles = [
  ['dsh-ai-providers', '@dsh-ai-providers/runtime', 'ai-providers'],
  ['dsh-ai-openai', '@dsh-ai-providers/openai', 'ai-openai'],
  ['dsh-ai-anthropic', '@dsh-ai-providers/anthropic', 'ai-anthropic'],
  ['dsh-ai-jina', '@dsh-ai-providers/jina', 'ai-jina'],
  ['dsh-ai-localai', '@dsh-ai-providers/localai', 'ai-localai'],
  ['dsh-ai-ollama', '@dsh-ai-providers/ollama', 'ai-ollama'],
  ['dsh-ai-cohere', '@dsh-ai-providers/cohere', 'ai-cohere'],
  ['dsh-ai-dashscope', '@dsh-ai-providers/dashscope', 'ai-dashscope'],
  ['dsh-ai-typesafe', '@dsh-ai-providers/typesafe', 'ai-typesafe'],
]
for (const [folder, name, id] of standaloneBundles) {
  const directory = resolve(root, 'packages', folder)
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'))
  const expected = `- insert:\n    - id: ${id}\n      name: '${name}'\n`
  if (await readFile(resolve(directory, 'cordis.patch.yml'), 'utf8') !== expected) throw new Error(`${name}: standalone bundle must insert only its own plugin row`)
  if (name !== '@dsh-ai-providers/runtime' && manifest.dependencies?.['@dsh-ai-providers/runtime'] !== `workspace:${version}`) {
    throw new Error(`${name}: vendor bundle must install @dsh-ai-providers/runtime without inserting its row`)
  }
}

const workspaceFile = await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
if (!workspaceFile.includes(`  '@deepseek-ai/dsh': ${DSH_DEVELOPMENT}\n`)) throw new Error(`pnpm-workspace.yaml must override @deepseek-ai/dsh to ${DSH_DEVELOPMENT} (run pnpm sync:dsh)`)
const resolvedDsh = new Set([...(await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8')).matchAll(/^  '@deepseek-ai\/dsh[a-z-]*@([^':(]+)/gm)].map(match => match[1]))
if (resolvedDsh.size !== 1 || !resolvedDsh.has(DSH_DEVELOPMENT)) throw new Error(`pnpm-lock.yaml must resolve every DSH package to ${DSH_DEVELOPMENT}, found ${[...resolvedDsh].join(', ')}: reinstall without the lockfile`)

console.log(`Release metadata and build outputs are valid for ${releasePackages.length} packages at ${version}.`)
