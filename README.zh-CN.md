# DSH AI Providers

为 [DeepSeek Harness](https://github.com/DeepSeek-AI/DeepSeek-Harness) 提供可复用、与供应商无关的 AI 服务。

[English](./README.md) | 简体中文

DSH AI Providers 面向需要接入多种 AI 能力的插件。用户只需配置一次供应商连接和由 DSH 管理的凭据，同一供应商提供的各项能力便可由不同插件复用。消费方插件调用稳定的公共服务，无须各自实现凭据管理、供应商选择、并发控制和供应商 API。

目前覆盖以下能力：

- 语言模型；
- 嵌入和重排序；
- 文本转语音和语音转文本；
- 图像生成。

本项目主要服务于插件开发者，以及使用这些插件的用户。单独安装它不会新增助手，也不会自行发送 AI 请求。用户需要配置所需的供应商，并安装或开发调用这些服务的消费方插件。

## 为什么使用它

- 一次配置连接和 DSH 凭据，无须在不同功能或插件中重复保存密钥。
- 用户可以更换供应商，消费方插件不必绑定某个供应商的 API。
- 多个插件可以共用能力契约、实时配置和并发限制。
- 公共接口只统一可共用的行为，供应商特有的实用选项仍可保留。

供应商无关的契约是项目的基础。新增供应商时，只需在契约后实现相应服务，不必让每个消费方插件重新加入一套传输代码。

## 工作方式

```text
消费方插件
    |
    v
@dsh-ai-providers/core 公共契约
    |
    v
@dsh-ai-providers/runtime
    |
    +-- OpenAI 兼容接口
    +-- LocalAI
    +-- Anthropic
    +-- Ollama
    +-- Cohere
    +-- DashScope
    +-- Jina
```

消费方插件依赖公共契约，而不是某个供应商包。运行时公开当前配置所选择的服务，并应用共用的并发控制。连接、请求默认值和供应商特有设置仍由各供应商包负责。

## 文档

- [简体中文文档](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/intro)
- [English documentation](https://firefox2100.github.io/dsh-ai-providers/docs/intro)
- [安装](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/getting-started/installation)
- [配置](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/getting-started/configuration)
- [在其他插件中使用服务](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/consumers/using-services)
- [核心契约参考](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/reference/core-contracts)
- [创建供应商包](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/providers/creating-provider)

## 包

| 包 | 用途 |
| --- | --- |
| `@dsh-ai-providers/core` | 与供应商无关的服务契约、错误类型和公共类型 |
| `@dsh-ai-providers/openai-compatible` | 可复用的 OpenAI 兼容传输实现；它不是插件 |
| `@dsh-ai-providers/runtime` | 供应商注册、服务选择、并发控制、API 路由和设置界面 |
| `@dsh-ai-providers/openai` | OpenAI 兼容的语言模型、嵌入、TTS、文件及实时 STT 和图像生成 |
| `@dsh-ai-providers/localai` | LocalAI 的语言模型、嵌入、重排序、TTS、文件及实时 STT 和图像生成 |
| `@dsh-ai-providers/anthropic` | 通过 Anthropic Messages API 提供语言模型 |
| `@dsh-ai-providers/ollama` | 通过 Ollama 原生 API 提供语言模型和嵌入 |
| `@dsh-ai-providers/cohere` | 通过 Cohere 原生 API 提供语言模型、嵌入和重排序 |
| `@dsh-ai-providers/dashscope` | 通过阿里云 DashScope（通义千问）原生 API 提供语言模型、嵌入、重排序、语音和图像 |
| `@dsh-ai-providers/jina` | 通过 Jina API 提供重排序和嵌入 |
| `@dsh-ai-providers/jina-cohere` | 可复用的 Jina 与 Cohere 风格重排序和嵌入传输层；不是插件 |
| `@dsh-ai-providers/all` | 仅包含元数据的 DSH 安装包，集合本项目维护的运行时和全部供应商插件 |

各供应商的配置和能力范围请参阅对应指南：

- [OpenAI 兼容接口](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/openai)
- [LocalAI](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/localai)
- [Anthropic](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/anthropic)
- [Ollama](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/ollama)
- [Cohere](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/cohere)
- [DashScope](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/dashscope)
- [Jina](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/official-providers/jina)

## 安装

DSH AI Providers 需要 Node.js 22 或更高版本，目前支持 DSH `>=0.2.0-rc.2 <0.2.1 || >=0.2.1-rc.2 <0.2.2`。

将完整安装包加入需要使用它的 DSH 配置档案：

```bash
dsh plugin --profile <profile> add @dsh-ai-providers/all
```

完整安装包会加入运行时和本项目维护的全部供应商插件。重启该配置档案，在 **设置 > 提供方** 中配置可复用端点和凭据，再到各项服务页面选择模型与参数。需要自定义组合时，也可以单独安装各个包。

如果要使用这里提供的语言模型路由替换 DSH 的内置路由，请在该配置档案中停用 `@deepseek-ai/dsh-llm-pi-ai` 和内置的 `ui-settings-models` 设置页，但保留 DSH 的核心 `llm` 服务。使用 DSH Voice Input 时，请保留它的语音转文本注册表，并选择 API 供应商代替内置 SenseVoice 供应商。

本项目由 Firefox2100 独立维护，并非 DeepSeek Harness 官方项目，也不由 DSH 维护者维护或认可。

## 插件开发者

消费方插件通常将 `@dsh-ai-providers/core` 加为依赖，再从 Cordis 上下文中取得所需服务。供应商开发者实现同一组契约，并向运行时注册所提供的能力。

开发消费方插件可从[使用服务](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/consumers/using-services)开始；开发新后端可参阅[创建供应商](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/providers/creating-provider)。[核心契约参考](https://firefox2100.github.io/dsh-ai-providers/zh-Hans/docs/reference/core-contracts)记录了生命周期、错误和请求类型。

## 开发

需要 Node.js 22 或更高版本，以及 pnpm。

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run release:check
```

分支和发布规则见 [Contributing](./CONTRIBUTING.md)。

## 许可证

[GPL-3.0-only](./LICENSE)
