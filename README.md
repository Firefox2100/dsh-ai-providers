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
| `@dsh-ai-providers/core` | Provider-neutral service contracts, errors, and shared types |
| `@dsh-ai-providers/openai-compatible` | Reusable OpenAI-compatible wire transports; not a plugin |
| `@dsh-ai-providers/runtime` | Provider registry, service selection, concurrency control, API routes, and settings UI |
| `@dsh-ai-providers/openai` | OpenAI-compatible language models, embeddings, TTS, file and live STT, and image generation |
| `@dsh-ai-providers/localai` | LocalAI language models, embeddings, reranking, TTS, file and live STT, and image generation |
| `@dsh-ai-providers/anthropic` | Language models through Anthropic's native Messages API |
| `@dsh-ai-providers/jina-cohere` | Reranking through Jina- and Cohere-compatible APIs |
| `@dsh-ai-providers/all` | Metadata-only DSH bundle containing the runtime and every provider maintained by this project |

See the individual provider guides for configuration and supported features:

- [OpenAI-compatible](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/openai)
- [LocalAI](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/localai)
- [Anthropic](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/anthropic)
- [Jina and Cohere](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/jina-cohere)

## Installation

Install the bundle into a DSH profile:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/all
```

The bundle installs the runtime and all vendor packages maintained by this project. Restart the profile, then configure connections, routes, and active services under **Settings → AI Providers**. Individual packages may also be installed separately for a custom deployment.

This is an independent project maintained by Firefox2100. It is not an official DeepSeek Harness project and is not maintained or endorsed by the DSH maintainers.

## Development

Requires Node.js 22 or later and pnpm.

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run release:check
```

See [Contributing](./CONTRIBUTING.md) for branch and release policy.

## License

[GPL-3.0-only](./LICENSE)
