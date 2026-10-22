/**
 * Type-checks and tests the workspace against another tested DSH release: copies it to a temporary folder,
 * pins the `@deepseek-ai` development dependencies to that release's own versions and runs the suites there.
 * Usage: node scripts/check-dsh-compat.mjs [dsh version]. Without a version it checks every tested release except
 * the one the workspace is developed against, so CI names none.
 */
import { execFileSync } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { DSH_DEVELOPMENT, DSH_RELEASES } from './dsh-compat.mjs'

const root = resolve(import.meta.dirname, '..')
const requested = process.argv[2]
if (requested !== undefined && !DSH_RELEASES.includes(requested)) throw new Error(`usage: check-dsh-compat.mjs [${DSH_RELEASES.join(' | ')}]`)
const versions = requested === undefined ? DSH_RELEASES.filter(release => release !== DSH_DEVELOPMENT) : [requested]

const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' })
async function check(version) {
  const dependencies = [JSON.parse(execFileSync('npm', ['view', `@deepseek-ai/dsh@${version}`, 'dependencies', '--json'], { encoding: 'utf8' }))].flat()[0]
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
    run('pnpm', ['install', '--no-frozen-lockfile'], copy)
    run('pnpm', ['-r', 'run', 'typecheck'], copy)
    run('pnpm', ['-r', 'run', 'test'], copy)
    console.log(`The packages type-check and pass their tests against DSH ${version}.`)
  } finally {
    if (process.env.KEEP_COPY === undefined) await rm(copy, { recursive: true, force: true })
    else console.log(`kept ${copy}`)
  }
}

for (const version of versions) await check(version)
