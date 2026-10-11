import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DSH AI Providers',
  tagline: 'Shared AI capabilities for DeepSeek Harness plugins',
  favicon: 'img/favicon.ico',
  future: {v4: true},
  url: 'https://firefox2100.github.io',
  baseUrl: '/dsh-ai-providers/',
  organizationName: 'Firefox2100',
  projectName: 'dsh-ai-providers',
  onBrokenLinks: 'throw',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en-GB'},
      'zh-Hans': {label: '简体中文', htmlLang: 'zh-CN'},
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/docs',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/Firefox2100/dsh-ai-providers/tree/main/docs/docs/',
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: 'DSH AI Providers',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/Firefox2100/dsh-ai-providers',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Installation', to: '/docs/getting-started/installation'},
            {label: 'Using services', to: '/docs/consumers/using-services'},
            {label: 'Creating a provider', to: '/docs/providers/creating-provider'},
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Firefox2100/dsh-ai-providers',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DSH AI Providers contributors.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
