import { describe, expect, it } from 'vitest'
import { resolveConnection } from '../src/connection.ts'

const field = <T>(value: T) => ({ get: () => value })
const config = (selected: string, connections: unknown[]) => ({
  connections: field(connections), embeddingConnection: field(selected), ttsConnection: field(selected), sttConnection: field(selected), imageConnection: field(selected),
}) as never

describe('OpenAI-compatible connections', () => {
  it('resolves the connection selected for a capability and normalizes its URL', () => {
    expect(resolveConnection(config('local', [{ id: 'local', name: 'LocalAI', baseUrl: 'http://localhost:8081/v1/', apiKeyRef: 'LOCALAI_API_KEY' }]), 'image')).toEqual({ baseUrl: 'http://localhost:8081/v1', apiKeyRef: 'LOCALAI_API_KEY' })
  })

  it('fails clearly for a missing selection, deleted connection, or invalid URL', () => {
    expect(() => resolveConnection(config('', []), 'tts')).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/no .* connection/) }))
    expect(() => resolveConnection(config('gone', []), 'stt')).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/does not exist/) }))
    expect(() => resolveConnection(config('bad', [{ id: 'bad', name: 'Bad', baseUrl: 'file:///tmp', apiKeyRef: '' }]), 'embedding')).toThrow(expect.objectContaining({ code: 'not-configured', message: expect.stringMatching(/HTTP/) }))
  })
})
