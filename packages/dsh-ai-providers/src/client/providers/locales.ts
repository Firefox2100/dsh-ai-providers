import type { Dictionaries } from '../i18n.ts'

export type ProvidersLocaleKey = 'nav' | 'title' | 'description' | 'empty'

export const dictionaries: Dictionaries<ProvidersLocaleKey> = {
  en: {
    nav: 'Providers',
    title: 'Providers',
    description: 'Configure reusable provider endpoints and credentials here. Models and service-specific parameters stay with each service.',
    empty: 'No configurable provider is installed.',
  },
  zh: {
    nav: '提供方',
    title: '提供方',
    description: '在此配置可复用的提供方端点和凭据。模型及服务专属参数仍在各项服务中配置。',
    empty: '尚未安装可配置的提供方。',
  },
}
