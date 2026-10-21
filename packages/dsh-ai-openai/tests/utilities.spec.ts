import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPublished } from '../../../scripts/npm-registry.mjs'
import { freshId } from '../src/client/llm-edit.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('language-model identifiers', () => {
  it('normalizes names, removes every edge separator, and finds a free suffix', () => {
    expect(freshId('--- Local / 大 Model ---', [])).toBe('local-大-model')
    expect(freshId('Local', ['local', 'local-2'])).toBe('local-3')
    expect(freshId('---', [])).toBe('route')
  })
})

describe('npm registry lookup', () => {
  it('distinguishes published and missing versions', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(isPublished('@scope/name', '1.2.3-beta.1')).resolves.toBe(true)
    await expect(isPublished('@scope/name', '1.2.4')).resolves.toBe(false)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://registry.npmjs.org/%40scope%2Fname/1.2.3-beta.1')
  })

  it('reports unexpected registry failures with their response details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('temporarily unavailable', { status: 503, statusText: 'Service Unavailable' })))

    await expect(isPublished('package', '1.0.0')).rejects.toThrow(
      'Could not query package@1.0.0: 503 Service Unavailable\ntemporarily unavailable',
    )
  })

  it('reports an unexpected empty registry failure without a blank detail line', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500, statusText: 'Internal Server Error' })))

    await expect(isPublished('package', '1.0.0')).rejects.toThrow(
      'Could not query package@1.0.0: 500 Internal Server Error',
    )
  })
})
