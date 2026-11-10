import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, credentialHeaders, validateHttpConnection, type HttpConnection } from '@dsh-ai-providers/core'
import type { DashScopeConnectionConfig, Config } from './config.ts'

/** A validated way to reach the API: its root, which ends with the version (`/api/v1`), and the name of the credential for it, if any. */
export type DashScopeConnection = HttpConnection

export function validateConnection(connection: Pick<DashScopeConnectionConfig, 'name' | 'baseUrl' | 'apiKeyRef'>): DashScopeConnection {
  return validateHttpConnection(connection)
}

export function connectionHeaders(connection: DashScopeConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  const provider = credentials()
  return credentialHeaders(connection, provider === undefined ? undefined : () => provider.resolve(credentialRef(connection.apiKeyRef)))
}

/** The connection a capability selection names; a selection that names none is not configured. */
export function resolveConnection(config: Pick<Config, 'connections'>, selected: string): DashScopeConnection {
  const connection = config.connections.get().find(item => item.id === selected)
  if (connection === undefined) throw new AiError('not-configured', selected === '' ? 'no connection is selected' : `the selected connection "${selected}" does not exist`)
  return validateConnection(connection)
}
