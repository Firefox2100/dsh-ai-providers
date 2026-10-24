# @dsh-ai-providers/core

Provider-neutral service contracts and shared types for AI integrations in DeepSeek Harness.

It defines the language model, embedding, reranking, decision, text-to-speech, speech-to-text, streaming transcription, and image-generation contracts used by provider and consumer plugins. Consumer plugins can target these contracts while the shared runtime handles user-selected providers, reusable connections, credentials, and concurrency. New vendor packages can therefore be added without redesigning each consumer.

It contains no provider implementation and registers no DSH plugin.

## Install

```bash
pnpm add @dsh-ai-providers/core
```

Most users should install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) instead. This package is intended for plugin developers implementing or consuming AI services.

[Core contract reference](https://firefox2100.github.io/dsh-ai-providers/docs/reference/core-contracts) · [Consumer guide](https://firefox2100.github.io/dsh-ai-providers/docs/consumers/using-services) · [Provider guide](https://firefox2100.github.io/dsh-ai-providers/docs/providers/creating-provider) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
