import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

type Props = PropsRuntime<'ai.provider.embedding'> & PropsLocale<'ai.localai'>

export function Card({ t, capability }: Props) {
  return <div data-testid="ai-localai"><h3>{t('title')}</h3><p>{t('description')}</p><p><strong>{t('capability')}:</strong> {capability}</p><p>{t('configure')}</p></div>
}

export function LlmCard({ t }: PropsLocale<'ai.localai'> & PropsRuntime<'ai.provider.llm'>) {
  return <div data-testid="ai-localai-llm"><h3>{t('title')}</h3><p>{t('llmDescription')}</p><p>{t('configure')}</p></div>
}
