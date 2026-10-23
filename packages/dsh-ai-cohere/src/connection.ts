import { AiError } from '@dsh-ai-providers/core'
import { connectionHeaders, validateConnection as validate, type ApiConnection } from '@dsh-ai-providers/jina-cohere'
import type { CohereConnectionConfig, Config } from './config.ts'

/** A validated way to reach the API: its root, which ends with the version (`/v2`), and the name of the credential for it, if any. */
export type CohereConnection = ApiConnection

export { connectionHeaders }

export function validateConnection(connection: CohereConnectionConfig): CohereConnection {
  return validate(connection)
}

/** The connection a capability selection names; a selection that names none is not configured. */
export function resolveConnection(config: Pick<Config, 'connections'>, selected: string): CohereConnection {
  const connection = config.connections.get().find(item => item.id === selected)
  if (connection === undefined) throw new AiError('not-configured', selected === '' ? 'no connection is selected' : `the selected connection "${selected}" does not exist`)
  return validateConnection(connection)
}
