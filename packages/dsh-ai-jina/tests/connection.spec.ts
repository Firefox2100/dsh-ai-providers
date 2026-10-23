import { describe, expect, it } from 'vitest'
import { resolveConnection } from '../src/connection.ts'

const field = <T>(value: T) => ({ get: () => value })
const config = (selected: string, connections: unknown[]) => ({ connections: field(connections), rerankConnection: field(selected), embeddingConnection: field(selected) }) as never

describe('Jina connections', () => {
  it('resolves the selected connection and normalizes its URL', () => {
    expect(resolveConnection(config('local', [{ id: 'local', name: 'LocalAI', baseUrl: 'http://localhost:8081/v1///', apiKeyRef: 'LOCALAI_API_KEY' }]), 'rerank')).toEqual({ baseUrl: 'http://localhost:8081/v1', apiKeyRef: 'LOCALAI_API_KEY' })
  })

  it('resolves the connection of the capability asked for', () => {
    const both = { connections: field([{ id: 'a', name: 'A', baseUrl: 'http://a/v1', apiKeyRef: '' }, { id: 'b', name: 'B', baseUrl: 'http://b/v2', apiKeyRef: '' }]), rerankConnection: field('a'), embeddingConnection: field('b') } as never
    expect([resolveConnection(both, 'rerank').baseUrl, resolveConnection(both, 'embedding').baseUrl]).toEqual(['http://a/v1', 'http://b/v2'])
  })

  it('fails clearly for a missing selection, deleted connection, or invalid URL', () => {
    expect(() => resolveConnection(config('', []), 'rerank')).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/no .* connection/) }))
    expect(() => resolveConnection(config('gone', []), 'rerank')).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/does not exist/) }))
    expect(() => resolveConnection(config('bad', [{ id: 'bad', name: 'Bad', baseUrl: 'file:///tmp', apiKeyRef: '' }]), 'rerank')).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/HTTP/) }))
  })
})
