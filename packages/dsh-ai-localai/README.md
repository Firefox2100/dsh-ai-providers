# @dsh-ai-providers/localai

First-class LocalAI language model, embedding, reranking, speech, and image generation services for DeepSeek Harness, including LocalAI-specific controls.

It lets users configure a LocalAI connection and credential once, then reuse them across consumer plugins and capabilities. It supports LocalAI's OpenAI-compatible endpoints while retaining LocalAI-specific sampling fields, request bodies, defaults, and native reranking. It shares only the neutral wire implementation with the OpenAI provider and does not depend on that plugin.

Installing it alone does not start LocalAI or make requests; a consumer plugin must request one of the services.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/localai
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/localai) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
