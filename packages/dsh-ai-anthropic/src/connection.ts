import {credentialRef, type CredentialProvider} from '@deepseek-ai/dsh-credentials'
import {AiError} from '@dsh-ai-providers/core'
import type {AnthropicConnectionConfig} from './config.ts'

export interface AnthropicConnection {baseUrl: string; apiKeyRef: string}
const withoutTrailingSlashes=(value:string):string=>{let end=value.length;while(value[end-1]==='/')end-=1;return value.slice(0,end)}
export function validateConnection(connection: AnthropicConnectionConfig): AnthropicConnection {
  const baseUrl = withoutTrailingSlashes(connection.baseUrl.trim())
  let url: URL
  try { url = new URL(baseUrl) } catch (error) { throw new AiError('not-configured', `the base URL for connection "${connection.name}" is invalid`, {cause: error}) }
  if (!['http:', 'https:'].includes(url.protocol)) throw new AiError('not-configured', `the base URL for connection "${connection.name}" must use HTTP or HTTPS`)
  return {baseUrl, apiKeyRef: connection.apiKeyRef.trim()}
}
export async function connectionHeaders(connection: AnthropicConnection, credentials: () => Pick<CredentialProvider, 'resolve'> | undefined): Promise<Record<string, string>> {
  if (connection.apiKeyRef === '') return {}
  let key: Awaited<ReturnType<CredentialProvider['resolve']>>
  try { key = await credentials()?.resolve(credentialRef(connection.apiKeyRef)) } catch (error) { throw new AiError('not-configured', `the credential name "${connection.apiKeyRef}" is not valid`, {cause: error}) }
  return key === undefined ? {} : {'x-api-key': key.value}
}
