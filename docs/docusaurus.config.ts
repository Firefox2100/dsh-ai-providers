import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DSH AI Providers',
  tagline: 'Shared AI capabilities for DeepSeek Harness plugins',
  favicon: 'img/favicon.svg',
  future: {v4: true},
  url: 'https://firefox2100.github.io',
  baseUrl: '/dsh-ai-providers/',
  organizationName: 'Firefox2100',
  projectName: 'dsh-ai-providers',
  onBrokenLinks: 'throw',
  headTags: [{
    tagName: 'script',
    attributes: {type: 'application/ld+json'},
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: 'DSH AI Providers',
      description: 'Provider-neutral AI capability contracts and provider plugins for DeepSeek Harness.',
      codeRepository: 'https://github.com/Firefox2100/dsh-ai-providers',
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'DeepSeek Harness 0.2.x',
      license: 'https://www.gnu.org/licenses/gpl-3.0.html',
    }),
  }],
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
        blog: {
          routeBasePath: 'blog',
          showReadingTime: true,
          feedOptions: {type: ['rss', 'atom'], xslt: true},
          editUrl: 'https://github.com/Firefox2100/dsh-ai-providers/tree/main/docs/blog/',
        },
        sitemap: {lastmod: 'date'},
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/social-card.png',
    metadata: [
      {name: 'keywords', content: 'DeepSeek Harness, DSH, AI providers, TypeScript, LLM, embeddings, reranking, text to speech, speech to text, image generation'},
      {name: 'robots', content: 'index, follow, max-image-preview:large'},
    ],
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: 'DSH AI Providers',
      logo: {alt: 'AI Providers', src: 'img/logo.svg'},
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
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
            {label: 'Blog', to: '/blog'},
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
