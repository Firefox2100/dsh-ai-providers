# @dsh-ai-providers/openai

OpenAI-compatible language model, embedding, text-to-speech, file and live speech-to-text, and image generation services for DeepSeek Harness.

The plugin provides reusable connections and credentials, model discovery, streaming tool-capable chat, and per-capability configuration. It uses [`@dsh-ai-providers/openai-compatible`](https://www.npmjs.com/package/@dsh-ai-providers/openai-compatible) for the shared protocol implementation.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/openai
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/openai) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
