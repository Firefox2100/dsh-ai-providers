import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { credentialHeaders, validateHttpConnection, type HttpConnection } from '@dsh-ai-providers/core'

/** A validated way to reach a rerank or embedding API: its root, and the name of the credential for it, if any. */
export type ApiConnection = HttpConnection

/** Checks and normalizes a configured connection: no trailing slashes, HTTP or HTTPS only. */
export function validateConnection(connection: { name: string; baseUrl: string; apiKeyRef: string }): ApiConnection {
  return validateHttpConnection(connection)
}

export function connectionHeaders(connection: ApiConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  const provider = credentials()
  return credentialHeaders(connection, provider === undefined ? undefined : () => provider.resolve(credentialRef(connection.apiKeyRef)))
}
