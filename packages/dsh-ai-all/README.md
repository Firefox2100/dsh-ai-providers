# @dsh-ai-providers/all

The complete AI provider foundation for DeepSeek Harness (DSH), maintained by Firefox2100 as part of the dsh-ai-providers project.

It installs the shared runtime plus the OpenAI, LocalAI, Anthropic, and Jina/Cohere provider plugins. Users configure each connection and DSH-managed credential once, then plugins can reuse it across language models, retrieval, speech, and image generation.

This package contains bundle metadata only; it has no JavaScript API. Installing it alone does not add an assistant or make AI requests. It supplies capabilities to other DSH plugins that consume the shared services.

## Install

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/all
```

Use the DSH settings interface to configure credentials, connections, models, capability routing, and concurrency limits after installation.

When using its language-model routes, disable DSH's stock model adapter and Models settings page, but keep the core `llm` service. For DSH Voice Input, select the API-backed transcription provider instead of the built-in SenseVoice provider.

This is an independent community project. It is not an official DSH package and is not maintained or endorsed by the DSH maintainers.

[Documentation](https://firefox2100.github.io/dsh-ai-providers/docs/intro) · [Installation guide](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/installation) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
