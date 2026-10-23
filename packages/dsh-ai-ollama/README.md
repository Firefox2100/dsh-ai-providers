# @dsh-ai-providers/ollama

Native [Ollama](https://ollama.com) language model and embedding support for DeepSeek Harness.

The plugin plugs Ollama into the shared runtime, so users configure a connection once and consumer plugins can reuse it. It speaks Ollama's own API rather than its OpenAI-compatible layer, so a route or model can set Ollama's native controls (`numCtx`, `keepAlive`, `think`, `format`, Mirostat and the other request options), and it provides model discovery with each model's reported capabilities, model load and unload, streaming chat with tools, vision and thinking, and embeddings.

Installing it alone does not add an assistant or invoke Ollama; a consumer plugin must use its model route or embedding service.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/ollama
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/ollama) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
