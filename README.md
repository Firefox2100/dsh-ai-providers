# DSH AI Providers

Provider-neutral AI services for [DeepSeek Harness](https://github.com/DeepSeek-AI/DeepSeek-Harness).

This monorepo supplies shared contracts, runtime provider selection, concurrency control, and vendor integrations for:

- language models;
- embeddings and reranking;
- text-to-speech and speech-to-text;
- image generation.

## Documentation

- [Documentation](https://firefox2100.github.io/dsh-ai-providers/docs/intro)
- [简体中文文档](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/intro)
- [Installation](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/installation)
- [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration)
- [Using services from another plugin](https://firefox2100.github.io/dsh-ai-providers/docs/consumers/using-services)
- [Creating a provider package](https://firefox2100.github.io/dsh-ai-providers/docs/providers/creating-provider)

## Packages

| Package | Purpose |
| --- | --- |
| `dsh-ai-core` | Provider-neutral service contracts, errors, and shared types |
| `dsh-ai-providers` | Provider registry, service selection, concurrency control, API routes, and settings UI |
| `dsh-ai-openai` | OpenAI-compatible language models, embeddings, TTS, file and live STT, and image generation |
| `dsh-ai-localai` | LocalAI language models, embeddings, reranking, TTS, file and live STT, and image generation |
| `dsh-ai-anthropic` | Language models through Anthropic's native Messages API |
| `dsh-ai-jina-cohere` | Reranking through Jina- and Cohere-compatible APIs |

See the individual provider guides for configuration and supported features:

- [OpenAI-compatible](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/openai)
- [LocalAI](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/localai)
- [Anthropic](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/anthropic)
- [Jina and Cohere](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/jina-cohere)

## Installation

Install the main plugin and only the vendor packages you need:

```bash
dsh plugin --profile <profile> add dsh-ai-providers
dsh plugin --profile <profile> add dsh-ai-openai
dsh plugin --profile <profile> add dsh-ai-anthropic
dsh plugin --profile <profile> add dsh-ai-jina-cohere
```

Restart the profile, then configure connections, routes, and active services under **Settings → AI Providers**.

## Development

Requires Node.js 22 or later and pnpm.

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

## License

[GPL-3.0-only](./LICENSE)
