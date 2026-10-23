import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError } from '@dsh-ai-providers/core'
import type { Config, OllamaConnectionConfig } from './config.ts'

/** A validated way to reach a server: the address of its API, and the name of the credential for it, if any. */
export interface OllamaConnection {
  /** Ends with `/api`, so a path is appended to it. */
  apiUrl: string
  apiKeyRef: string
}

/** Strips trailing slashes and a trailing `/api`, which some people copy from the docs and some leave out. */
function root(value: string): string {
  let end = value.length
  while (value[end - 1] === '/') end -= 1
  const trimmed = value.slice(0, end)
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

export function validateConnection(connection: OllamaConnectionConfig): OllamaConnection {
  const base = root(connection.baseUrl.trim())
  let url: URL
  try { url = new URL(base) } catch (error) { throw new AiError('not-configured', `the base URL for connection "${connection.name}" is invalid`, { cause: error }) }
  if (!['http:', 'https:'].includes(url.protocol)) throw new AiError('not-configured', `the base URL for connection "${connection.name}" must use HTTP or HTTPS`)
  return { apiUrl: `${base}/api`, apiKeyRef: connection.apiKeyRef.trim() }
}

/** The connection a capability selection names; a selection that names none is not configured. */
export function resolveConnection(config: Config, selected: string): OllamaConnection {
  const connection = config.connections.get().find(item => item.id === selected)
  if (connection === undefined) throw new AiError('not-configured', selected === '' ? 'no connection is selected' : `the selected connection "${selected}" does not exist`)
  return validateConnection(connection)
}

export async function connectionHeaders(connection: OllamaConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  if (connection.apiKeyRef === '') return {}
  let key: Awaited<ReturnType<CredentialProvider['resolve']>>
  try { key = await credentials()?.resolve(credentialRef(connection.apiKeyRef)) } catch (error) { throw new AiError('not-configured', `the credential name "${connection.apiKeyRef}" is not valid`, { cause: error }) }
  return key === undefined ? {} : { authorization: `Bearer ${key.value}` }
}
