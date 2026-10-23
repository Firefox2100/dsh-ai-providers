# @dsh-ai-providers/dashscope

Native [Alibaba Cloud DashScope](https://www.alibabacloud.com/help/en/model-studio) (Qwen) language model, embedding, reranking, speech, and image support for DeepSeek Harness.

The plugin plugs DashScope into the shared runtime, so users configure a connection and DSH-managed credential once and consumer plugins can reuse it. It speaks DashScope's own API rather than its OpenAI-compatible layer: streaming generation with tools, thinking, web search, and image input; model discovery; embeddings that send a query or a document as DashScope's text type; reranking with an instruction; speech synthesis (Qwen-TTS and CosyVoice), file speech recognition, and image generation. A route or model can set DashScope's native controls (`enableThinking`, `thinkingBudget`, `enableSearch`, `searchOptions`, `responseFormat` and others).

Installing it alone does not add an assistant or invoke DashScope; a consumer plugin must use its model route or services.

## Install

Install [`@dsh-ai-providers/all`](https://www.npmjs.com/package/@dsh-ai-providers/all) for the complete project-maintained bundle, or add this package alongside the runtime in a custom deployment:

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/runtime
dsh plugin --profile <profile> add @dsh-ai-providers/dashscope
```

The runtime command activates the shared registry and settings surface. Installing this package also downloads the runtime as a package dependency, but DSH activates bundle layers explicitly, so both commands are required.

[Provider documentation](https://firefox2100.github.io/dsh-ai-providers/docs/official-providers/dashscope) · [Configuration](https://firefox2100.github.io/dsh-ai-providers/docs/getting-started/configuration) · [Source](https://github.com/Firefox2100/dsh-ai-providers) · [Issues](https://github.com/Firefox2100/dsh-ai-providers/issues)

Licensed under GPL-3.0-only.
