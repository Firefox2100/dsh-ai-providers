# @dsh-ai-providers/jina

Jina AI reranking and embedding support for DeepSeek Harness.

The plugin plugs Jina into the shared runtime, so users configure a connection and DSH-managed credential once and consumer plugins can reuse it. It provides reranking through the `/rerank` API and embeddings through `/embeddings`, sending a query or a document as the model's own task (`retrieval.query` or `retrieval.passage`), with shortened vectors and truncation controls. The rerank API is the one Cohere and servers such as vLLM share, so a compatible server also works with a custom base URL.

Installing it alone does not add an assistant or invoke Jina; a consumer plugin must use its services.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/jina
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/jina) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
