import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError } from 'dsh-ai-core'
import type { Config } from './config.ts'

export interface JinaCohereConnection { baseUrl: string; apiKeyRef: string }

export function resolveConnection(config: Config): JinaCohereConnection {
  const id = config.rerankConnection.get().trim()
  if (id === '') throw new AiError('not-configured', 'no Jina / Cohere connection is selected for reranking')
  const connection = config.connections.get().find(candidate => candidate.id === id)
  if (connection === undefined) throw new AiError('not-configured', `the selected Jina / Cohere connection "${id}" does not exist`)
  const baseUrl = connection.baseUrl.trim().replace(/\/+$/, '')
  if (baseUrl === '') throw new AiError('not-configured', 'no base URL is configured')
  let url: URL
  try { url = new URL(baseUrl) }
  catch (error) { throw new AiError('not-configured', `the base URL for connection "${connection.name}" is invalid`, { cause: error }) }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AiError('not-configured', `the base URL for connection "${connection.name}" must use HTTP or HTTPS`)
  return { baseUrl, apiKeyRef: connection.apiKeyRef.trim() }
}

export async function connectionHeaders(connection: JinaCohereConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  if (connection.apiKeyRef === '') return {}
  let key: Awaited<ReturnType<CredentialProvider['resolve']>>
  try { key = await credentials()?.resolve(credentialRef(connection.apiKeyRef)) }
  catch (error) { throw new AiError('not-configured', `the credential name "${connection.apiKeyRef}" is not valid: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
  return key === undefined ? {} : { authorization: `Bearer ${key.value}` }
}
