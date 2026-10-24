import { describe, expect, it } from 'vitest'
import { resolveConnection } from '../src/connection.ts'

const field = <T>(value: T) => ({ get: () => value })
const config = (selected: string, connections: unknown[]) => ({ connections: field(connections), decisionConnection: field(selected) }) as never

describe('TypeSafe connections', () => {
  it('resolves the selected connection and normalizes its URL', () => {
    expect(resolveConnection(config('local', [{ id: 'local', name: 'Local', baseUrl: 'http://localhost:8081/v1///', apiKeyRef: 'LOCAL_KEY' }]))).toEqual({ baseUrl: 'http://localhost:8081/v1', apiKeyRef: 'LOCAL_KEY' })
  })

  it('fails clearly for a missing selection, deleted connection, or invalid URL', () => {
    expect(() => resolveConnection(config('', []))).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/no .* connection/) }))
    expect(() => resolveConnection(config('gone', []))).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/does not exist/) }))
    expect(() => resolveConnection(config('bad', [{ id: 'bad', name: 'Bad', baseUrl: 'file:///tmp', apiKeyRef: '' }]))).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/HTTP/) }))
  })
})
