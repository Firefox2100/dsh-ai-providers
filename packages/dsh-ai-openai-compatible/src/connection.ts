import { AiError, credentialHeaders, validateHttpConnection, type Capability, type HttpConnection } from '@dsh-ai-providers/core'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { Config, OpenAiConnectionConfig } from './config.ts'

export type OpenAiConnection = HttpConnection

/** The key of the connection, when one is configured and stored. */
export function connectionHeaders(connection: OpenAiConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  const provider = credentials()
  return credentialHeaders(connection, provider === undefined ? undefined : () => provider.resolve(credentialRef(connection.apiKeyRef)))
}

export type OpenAiCapability = Extract<Capability, 'embedding' | 'tts' | 'stt' | 'image' | 'decision'>

const selectedId = (config: Config, capability: OpenAiCapability): string => ({
  embedding: config.embeddingConnection,
  tts: config.ttsConnection,
  stt: config.sttConnection,
  image: config.imageConnection,
  decision: config.decisionConnection,
})[capability].get().trim()

export function resolveConnection(config: Config, capability: OpenAiCapability): OpenAiConnection {
  const id = selectedId(config, capability)
  const connections = config.connections.get()
  if (id === '') throw new AiError('not-configured', `no OpenAI-compatible connection is selected for ${capability}`)
  const connection = connections.find(candidate => candidate.id === id)
  if (connection === undefined) throw new AiError('not-configured', `the selected OpenAI-compatible connection "${id}" does not exist`)
  return validateConnection(connection)
}

export function validateConnection(connection: OpenAiConnectionConfig): OpenAiConnection {
  return validateHttpConnection(connection)
}
