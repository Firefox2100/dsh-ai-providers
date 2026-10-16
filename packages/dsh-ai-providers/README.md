# @dsh-ai-providers/runtime

The shared provider runtime for DeepSeek Harness plugins.

It gives users one place to register reusable connections and DSH-managed credentials, select providers, and manage request concurrency. It exposes provider-neutral AI services to consumer plugins, so each plugin does not need its own vendor configuration and integration layer.

The runtime does not implement a vendor API, add an assistant, or make AI requests by itself. Install at least one provider package and a plugin that consumes its services.

## Install

Most users should install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all). For a custom deployment, install this runtime and only the desired provider plugins:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
```

[Documentation](https://firefox2100.github.io/dsh-ai-providers/docs/intro) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
