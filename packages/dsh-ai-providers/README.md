# @dsh-ai-providers/runtime

Provider registry, service selection, concurrency control, API routes, and settings UI for DeepSeek Harness.

This is the provider-neutral DSH runtime. It exposes configured AI services to other plugins and lets users select providers and manage request concurrency. It does not call a vendor API by itself.

## Install

Most users should install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all). For a custom deployment, install this runtime and only the desired provider plugins:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
```

[Documentation](https://firefox2100.github.io/dsh-ai-providers/docs/intro) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
