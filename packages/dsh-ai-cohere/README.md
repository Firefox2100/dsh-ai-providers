# @dsh-ai-providers/cohere

Native [Cohere](https://cohere.com) language model, embedding, and reranking support for DeepSeek Harness.

The plugin plugs Cohere into the shared runtime, so users configure a connection and DSH-managed credential once and consumer plugins can reuse it. It speaks Cohere's v2 API directly: streaming chat with tools, thinking, and image input; model discovery; embeddings that send a query or a document as Cohere's own input type; and reranking. A route or model can set Cohere's native controls (`safetyMode`, `thinking`, `strictTools`, `citationMode`, `responseFormat` and others).

Installing it alone does not add an assistant or invoke Cohere; a consumer plugin must use its model route or services.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/cohere
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/cohere) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
