import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError } from '@dsh-ai-providers/core'
import { validateConnection } from '@dsh-ai-providers/openai-compatible'
import { SystemOneApiService } from '@dsh-ai-providers/systemone'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'

/** LocalAI's decisions: `POST {base URL}/systemone` to a decision model installed in it, such as Julia-1 or Laya. */
export function localAiDecision(config: Config, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined, send?: typeof fetch): SystemOneApiService {
  return new SystemOneApiService({
    config, provider: PROVIDER_ID, credentials, body: () => config.decisionBody.get(),
    connection: () => {
      const id = config.decisionConnection.get().trim()
      if (id === '') throw new AiError('not-configured', 'no LocalAI connection is selected for decisions')
      const selected = config.connections.get().find(connection => connection.id === id)
      if (selected === undefined) throw new AiError('not-configured', `the selected LocalAI connection "${id}" does not exist`)
      return validateConnection(selected)
    },
    ...send === undefined ? {} : { fetch: send },
  })
}
