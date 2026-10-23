import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@dsh-ai-providers/core/slots'
import css from './ProvidersSection.module.css'

export type ProvidersSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'ai.providers'> & PropsRenderSlots<'ai.provider.connection'>

export function ProvidersSection({ t, renderSlot }: ProvidersSectionProps) {
  return (
    <div className={css.section} data-testid="ai-providers-connections">
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.description}>{t('description')}</p>
      <div className={css.providers}>{renderSlot('ai.provider.connection', {})}</div>
    </div>
  )
}
