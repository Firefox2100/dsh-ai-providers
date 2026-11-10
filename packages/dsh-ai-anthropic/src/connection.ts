import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { credentialHeaders, validateHttpConnection, type HttpConnection } from '@dsh-ai-providers/core'
import type { AnthropicConnectionConfig } from './config.ts'

export type AnthropicConnection = HttpConnection

export function validateConnection(connection: AnthropicConnectionConfig): AnthropicConnection {
  return validateHttpConnection(connection)
}

/** Anthropic reads its key from `x-api-key` rather than a bearer token. */
export function connectionHeaders(connection: AnthropicConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  const provider = credentials()
  return credentialHeaders(connection, provider === undefined ? undefined : () => provider.resolve(credentialRef(connection.apiKeyRef)), { name: 'x-api-key', format: value => value })
}
