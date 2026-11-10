import type { Dictionaries } from '../i18n.ts'

export type ProvidersLocaleKey = 'nav' | 'section' | 'tablist' | 'pageCapabilities' | 'capabilities' | 'title' | 'description' | 'empty'

export const dictionaries: Dictionaries<ProvidersLocaleKey> = {
  en: {
    nav: 'Providers',
    section: 'AI providers', tablist: 'AI provider pages', pageCapabilities: 'Capabilities', capabilities: 'Capabilities',
    title: 'Providers',
    description: 'Configure reusable provider endpoints and credentials here. Models and service-specific parameters stay with each service.',
    empty: 'No configurable provider is installed.',
  },
  zh: {
    nav: '提供方',
    section: 'AI 提供方', tablist: 'AI 提供方页面', pageCapabilities: '能力', capabilities: '能力',
    title: '提供方',
    description: '在此配置可复用的提供方端点和凭据。模型及服务专属参数仍在各项服务中配置。',
    empty: '尚未安装可配置的提供方。',
  },
  ja: {
    nav: 'プロバイダー', section: 'AI プロバイダー', tablist: 'AI プロバイダーのページ', pageCapabilities: '機能', capabilities: '機能',
    title: 'プロバイダー', description: '再利用できるプロバイダーのエンドポイントと認証情報をここで設定します。モデルとサービス固有の設定は、各サービスのページにあります。', empty: '設定できるプロバイダーがインストールされていません。',
  },
  es: {
    nav: 'Proveedores', section: 'Proveedores de IA', tablist: 'Páginas de proveedores de IA', pageCapabilities: 'Funciones', capabilities: 'Funciones',
    title: 'Proveedores', description: 'Configura aquí los endpoints y las credenciales reutilizables de cada proveedor. Los modelos y los ajustes específicos se configuran en cada servicio.', empty: 'No hay ningún proveedor configurable instalado.',
  },
  fr: {
    nav: 'Fournisseurs', section: 'Fournisseurs d’IA', tablist: 'Pages des fournisseurs d’IA', pageCapabilities: 'Fonctions', capabilities: 'Fonctions',
    title: 'Fournisseurs', description: 'Configurez ici les points de terminaison et les identifiants réutilisables des fournisseurs. Les modèles et les réglages propres à chaque service restent dans la page du service concerné.', empty: 'Aucun fournisseur configurable n’est installé.',
  },
  de: {
    nav: 'Anbieter', section: 'KI-Anbieter', tablist: 'Seiten der KI-Anbieter', pageCapabilities: 'Funktionen', capabilities: 'Funktionen',
    title: 'Anbieter', description: 'Hier richtest du wiederverwendbare Anbieter-Endpunkte und Zugangsdaten ein. Modelle und dienstspezifische Einstellungen bleiben beim jeweiligen Dienst.', empty: 'Es ist kein konfigurierbarer Anbieter installiert.',
  },
  ru: {
    nav: 'Провайдеры', section: 'Провайдеры ИИ', tablist: 'Страницы провайдеров ИИ', pageCapabilities: 'Возможности', capabilities: 'Возможности',
    title: 'Провайдеры', description: 'Здесь настраиваются общие конечные точки и учётные данные провайдеров. Модели и параметры отдельных сервисов настраиваются на страницах этих сервисов.', empty: 'Нет установленных провайдеров с доступными настройками.',
  },
  pt: {
    nav: 'Provedores', section: 'Provedores de IA', tablist: 'Páginas dos provedores de IA', pageCapabilities: 'Recursos', capabilities: 'Recursos',
    title: 'Provedores', description: 'Configure aqui endpoints e credenciais reutilizáveis dos provedores. Os modelos e os parâmetros específicos continuam na página de cada serviço.', empty: 'Nenhum provedor configurável está instalado.',
  },
}
