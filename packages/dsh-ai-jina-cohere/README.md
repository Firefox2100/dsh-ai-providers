# @dsh-ai-providers/jina-cohere

Reranking through Jina- and Cohere-compatible APIs for DeepSeek Harness.

The plugin supports the common `/rerank` request shape used by Jina AI, Cohere, and compatible services. Users configure connections and DSH-managed credentials once, while model and request defaults remain provider-specific. Any consumer plugin using the shared reranking service can then use the selected backend.

Installing it alone does not perform retrieval or reranking; a consumer plugin must request the service.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/jina-cohere
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/jina-cohere) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
