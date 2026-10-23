# @dsh-ai-providers/jina-cohere

Reusable Jina- and Cohere-style rerank and embedding transports for DSH AI providers.

This package is a library, not a DSH plugin: it registers nothing and adds no settings. It holds the `POST /rerank` transport that Jina, Cohere, and compatible servers share, and the embedding transport for the Jina (`/embeddings`) and Cohere v2 (`/embed`) APIs, so that vendor plugins can reuse them without depending on each other. Install [`@dsh-ai-providers/jina`](https://www.npmjs.com/package/@dsh-ai-providers/jina) or [`@dsh-ai-providers/cohere`](https://www.npmjs.com/package/@dsh-ai-providers/cohere) to use them.

[Package reference](https://firefox2100.github.io/dsh-ai-providers/docs/reference/packages) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
