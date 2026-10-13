# @dsh-ai-providers/anthropic

Native Anthropic Messages API language model support for DeepSeek Harness.

The plugin plugs Anthropic into the shared runtime, so users configure a connection and DSH-managed credential once and consumer plugins can reuse it. It provides model routes, streaming responses, vision, tool use, reasoning content, usage reporting, and Anthropic-native request controls.

Installing it alone does not add an assistant or invoke Anthropic; a consumer plugin must use its model route.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/anthropic
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/anthropic) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
