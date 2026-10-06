import { AiError, type Capability } from 'dsh-ai-core'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { Config, OpenAiConnectionConfig } from './config.ts'

export interface OpenAiConnection {
  baseUrl: string
  apiKeyRef: string
}

export async function connectionHeaders(connection: OpenAiConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  if (connection.apiKeyRef === '') return {}
  let key: Awaited<ReturnType<CredentialProvider['resolve']>>
  try { key = await credentials()?.resolve(credentialRef(connection.apiKeyRef)) }
  catch (error) { throw new AiError('not-configured', `the credential name "${connection.apiKeyRef}" is not valid: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
  return key === undefined ? {} : { authorization: `Bearer ${key.value}` }
}

type OpenAiCapability = Extract<Capability, 'embedding' | 'tts' | 'stt' | 'image'>

const selectedId = (config: Config, capability: OpenAiCapability): string => ({
  embedding: config.embeddingConnection,
  tts: config.ttsConnection,
  stt: config.sttConnection,
  image: config.imageConnection,
})[capability].get().trim()

export function resolveConnection(config: Config, capability: OpenAiCapability): OpenAiConnection {
  const id = selectedId(config, capability)
  const connections = config.connections.get()
  if (id === '') throw new AiError('not-configured', `no OpenAI-compatible connection is selected for ${capability}`)
  const connection = connections.find(candidate => candidate.id === id)
  if (connection === undefined) throw new AiError('not-configured', `the selected OpenAI-compatible connection "${id}" does not exist`)
  return validateConnection(connection)
}

function validateConnection(connection: OpenAiConnectionConfig): OpenAiConnection {
  const baseUrl = connection.baseUrl.trim().replace(/\/+$/, '')
  if (baseUrl === '') throw new AiError('not-configured', 'no base URL is configured')
  let url: URL
  try { url = new URL(baseUrl) }
  catch (error) { throw new AiError('not-configured', `the base URL for connection "${connection.name}" is invalid`, { cause: error }) }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AiError('not-configured', `the base URL for connection "${connection.name}" must use HTTP or HTTPS`)
  return { baseUrl, apiKeyRef: connection.apiKeyRef.trim() }
}
