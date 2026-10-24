# @dsh-ai-providers/typesafe

TypeSafe AI's Jev decisions for DeepSeek Harness.

The plugin plugs the hosted Jev API into the shared runtime, so users configure a connection and a DSH-managed credential once and consumer plugins can reuse it. Jev is a decision model: given a state and typed questions (does a statement hold, which option fits, where on a scale), it answers with probabilities in a single pass instead of writing text. The plugin supplies the decision service through the `POST /v1/systemone` API, with the model as the API names it (`jev-latest` or a pinned version) and an optional switch for the longer context. A server that copies the API, such as a local one, works through a custom base URL.

Installing it alone does not add an assistant or invoke Jev; a consumer plugin must use its service. Jev is a paid hosted service: the text a consumer sends is sent to TypeSafe.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/typesafe
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/typesafe) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
