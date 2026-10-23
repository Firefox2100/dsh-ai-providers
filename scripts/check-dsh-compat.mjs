/**
 * Type-checks and tests the workspace against another tested DSH release: copies it to a temporary folder,
 * pins the `@deepseek-ai` development dependencies to that release's own versions and runs the suites there.
 * Usage: pnpm check:dsh [dsh version]. Without a version it checks every tested release except
 * the one the workspace is developed against, so CI names none.
 */
import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { DSH_DEVELOPMENT, DSH_RELEASES } from './dsh-compat.mjs'

const root = resolve(import.meta.dirname, '..')
const requested = process.argv[2]
if (requested !== undefined && !DSH_RELEASES.includes(requested)) throw new Error(`usage: check-dsh-compat.mjs [${DSH_RELEASES.join(' | ')}]`)
const versions = requested === undefined ? DSH_RELEASES.filter(release => release !== DSH_DEVELOPMENT) : [requested]

const pnpmCli = process.env.npm_execpath
if (pnpmCli === undefined || !isAbsolute(pnpmCli)) throw new Error('run this compatibility check through pnpm')
const runPnpm = (args, cwd) => execFileSync(pnpmCli, args, { cwd, stdio: 'inherit' })
async function check(version) {
  const response = await fetch(`https://registry.npmjs.org/@deepseek-ai%2Fdsh/${encodeURIComponent(version)}`, {headers: {accept: 'application/json'}})
  if (!response.ok) throw new Error(`could not read @deepseek-ai/dsh@${version} from npm: ${response.status} ${response.statusText}`)
  const dependencies = (await response.json()).dependencies
  const bare = range => range.replace(/^[~^]/, '')
  const pins = new Map([
    ['@deepseek-ai/cordis', bare(dependencies['@deepseek-ai/cordis'])],
    ['@deepseek-ai/schemastery', bare(dependencies['@deepseek-ai/schemastery'])],
    ['@deepseek-ai/cordis-plugin-loader', bare(dependencies['@deepseek-ai/cordis-plugin-loader'])],
  ])
  const pinned = name => (name.startsWith('@deepseek-ai/dsh-') ? version : pins.get(name))

  const copy = await mkdtemp(join(tmpdir(), 'dsh-compat-'))
  try {
    await cp(root, copy, { recursive: true, filter: source => !/(^|\/)(node_modules|coverage|lib|\.git)(\/|$)/.test(source.slice(root.length)) })
    for (const folder of await readdir(join(copy, 'packages'))) {
      const file = join(copy, 'packages', folder, 'package.json')
      const manifest = JSON.parse(await readFile(file, 'utf8'))
      for (const [name] of Object.entries(manifest.devDependencies ?? {})) {
        const range = pinned(name)
        if (range !== undefined) manifest.devDependencies[name] = range
      }
      await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`)
    }
    // One copy of each shared library, as the release itself runs with.
    const workspaceFile = join(copy, 'pnpm-workspace.yaml')
    const overrides = [...pins].map(([name, pin]) => `  '${name}': ${pin}`).join('\n')
    const kept = (await readFile(workspaceFile, 'utf8')).split('\n').filter(line => ![...pins.keys()].some(name => line.startsWith(`  '${name}':`))).join('\n')
    await writeFile(workspaceFile, kept.replace('overrides:\n', `overrides:\n${overrides}\n`))
    runPnpm(['install', '--no-frozen-lockfile'], copy)
    runPnpm(['-r', 'run', 'typecheck'], copy)
    runPnpm(['-r', 'run', 'test'], copy)
    console.log(`The packages type-check and pass their tests against DSH ${version}.`)
  } finally {
    if (process.env.KEEP_COPY === undefined) await rm(copy, { recursive: true, force: true })
    else console.log(`kept ${copy}`)
  }
}

for (const version of versions) await check(version)
