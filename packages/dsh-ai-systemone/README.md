# @dsh-ai-providers/systemone

Reusable System One decision transport for DSH AI providers.

This package is a library, not a DSH plugin: it registers nothing and adds no settings. It holds the `POST {baseUrl}/systemone` transport that TypeSafe's Jev, LocalAI, llama.cpp's server and other compatible servers share: a state and typed questions go in, and probabilities for each answer come out in one pass, without the model writing text. Vendor plugins reuse it without depending on each other. Install [`@dsh-ai-providers/typesafe`](https://www.npmjs.com/package/@dsh-ai-providers/typesafe) or [`@dsh-ai-providers/localai`](https://www.npmjs.com/package/@dsh-ai-providers/localai) to use it.

[Package reference](https://firefox2100.github.io/dsh-ai-providers/docs/reference/packages) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
