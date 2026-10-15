import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './Card.module.css'

type Props = PropsRuntime<'ai.provider.embedding'> & PropsLocale<'ai.localai'>

export function Card({ t, capability }: Props) {
  return <div data-testid="ai-localai" className={css.card}><h3 className={css.title}>{t('title')}</h3><p className={css.text}>{t('description')}</p><p className={css.text}><strong className={css.label}>{t('capability')}:</strong> {capability}</p><p className={css.text}>{t('configure')}</p></div>
}

export function LlmCard({ t }: PropsLocale<'ai.localai'> & PropsRuntime<'ai.provider.llm'>) {
  return <div data-testid="ai-localai-llm" className={css.card}><h3 className={css.title}>{t('title')}</h3><p className={css.text}>{t('llmDescription')}</p><p className={css.text}>{t('configure')}</p></div>
}
