# @dsh-ai-providers/openai-compatible

Reusable OpenAI-compatible wire transports shared by the OpenAI and LocalAI providers. This is a protocol library, not a DSH plugin.

It implements streaming chat completions, embeddings, text-to-speech, file and live speech-to-text, image generation, request serialization, SSE handling, and common error translation. Provider plugins supply their own identity, defaults, UI, and vendor-specific behavior.

## Install

```bash
pnpm add @dsh-ai-providers/openai-compatible
```

Most users should install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) instead. Use this package when implementing another provider backed by an OpenAI-compatible protocol.

[Package reference](https://firefox2100.github.io/dsh-ai-providers/docs/reference/packages) · [Provider guide](https://firefox2100.github.io/dsh-ai-providers/docs/providers/creating-provider) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
