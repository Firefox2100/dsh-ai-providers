import { AiError } from '@dsh-ai-providers/core'
import { validateConnection, type ApiConnection } from '@dsh-ai-providers/systemone'
import type { Config } from './config.ts'

/** The connection that the selection of the decision capability names. */
export function resolveConnection(config: Pick<Config, 'connections' | 'decisionConnection'>): ApiConnection {
  const id = config.decisionConnection.get().trim()
  if (id === '') throw new AiError('not-configured', 'no TypeSafe connection is selected for decisions')
  const connection = config.connections.get().find(candidate => candidate.id === id)
  if (connection === undefined) throw new AiError('not-configured', `the selected TypeSafe connection "${id}" does not exist`)
  return validateConnection(connection)
}
