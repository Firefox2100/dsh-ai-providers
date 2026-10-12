import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting started',
      items: ['getting-started/installation', 'getting-started/configuration'],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: ['concepts/architecture', 'concepts/concurrency'],
    },
    {
      type: 'category',
      label: 'Services',
      items: [
        'services/embeddings',
        'services/reranking',
        'services/language-models',
        'services/text-to-speech',
        'services/speech-to-text',
        'services/image-generation',
      ],
    },
    {
      type: 'category',
      label: 'Official providers',
      items: ['official-providers/openai', 'official-providers/localai', 'official-providers/anthropic', 'official-providers/jina-cohere'],
    },
    {
      type: 'category',
      label: 'For plugin authors',
      items: ['consumers/using-services'],
    },
    {
      type: 'category',
      label: 'For provider authors',
      items: ['providers/creating-provider'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['reference/packages', 'reference/troubleshooting'],
    },
  ],
};

export default sidebars;
