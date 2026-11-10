import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandHome } from '../src/host/trace/setup.ts'

describe('expanding a configured home path', () => {
  it('leaves an ordinary absolute path alone', () => {
    const path = join(homedir(), 'traces')
    expect(expandHome(path)).toBe(path)
  })

  it('expands a leading tilde with either separator', () => {
    expect(expandHome('~')).toBe(homedir())
    expect(expandHome('~/traces')).toBe(join(homedir(), '/traces'))
    expect(expandHome('~\\traces')).toBe(join(homedir(), '\\traces'))
  })

  it('makes a relative path absolute and reads an empty value as nothing', () => {
    expect(expandHome('traces')).toBe(resolve('traces'))
    expect(expandHome('   ')).toBe('')
  })
})
