import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError } from '@dsh-ai-providers/core'

/** A validated way to reach a decision API: its root, and the name of the credential for it, if any. */
export interface ApiConnection { baseUrl: string; apiKeyRef: string }

/** Checks and normalizes a configured connection: no trailing slashes, HTTP or HTTPS only. */
export function validateConnection(connection: { name: string; baseUrl: string; apiKeyRef: string }): ApiConnection {
  const trimmed = connection.baseUrl.trim()
  let end = trimmed.length
  while (trimmed[end - 1] === '/') end -= 1
  const baseUrl = trimmed.slice(0, end)
  if (baseUrl === '') throw new AiError('not-configured', 'no base URL is configured')
  let url: URL
  try { url = new URL(baseUrl) }
  catch (error) { throw new AiError('not-configured', `the base URL for connection "${connection.name}" is invalid`, { cause: error }) }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AiError('not-configured', `the base URL for connection "${connection.name}" must use HTTP or HTTPS`)
  return { baseUrl, apiKeyRef: connection.apiKeyRef.trim() }
}

export async function connectionHeaders(connection: ApiConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  if (connection.apiKeyRef === '') return {}
  let key: Awaited<ReturnType<CredentialProvider['resolve']>>
  try { key = await credentials()?.resolve(credentialRef(connection.apiKeyRef)) }
  catch (error) { throw new AiError('not-configured', `the credential name "${connection.apiKeyRef}" is not valid: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
  return key === undefined ? {} : { authorization: `Bearer ${key.value}` }
}
