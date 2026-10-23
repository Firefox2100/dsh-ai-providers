import { AiError } from '@dsh-ai-providers/core'
import { validateConnection, type ApiConnection } from '@dsh-ai-providers/jina-cohere'
import type { Config } from './config.ts'

/** The connection that the selection of a capability names. */
export function resolveConnection(config: Pick<Config, 'connections' | 'rerankConnection' | 'embeddingConnection'>, capability: 'rerank' | 'embedding'): ApiConnection {
  const id = (capability === 'rerank' ? config.rerankConnection : config.embeddingConnection).get().trim()
  if (id === '') throw new AiError('not-configured', `no Jina connection is selected for ${capability === 'rerank' ? 'reranking' : 'embedding'}`)
  const connection = config.connections.get().find(candidate => candidate.id === id)
  if (connection === undefined) throw new AiError('not-configured', `the selected Jina connection "${id}" does not exist`)
  return validateConnection(connection)
}
