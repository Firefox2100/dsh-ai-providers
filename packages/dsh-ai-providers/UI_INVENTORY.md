# Provider UI inventory

## Runtime-owned surfaces

- Providers: one shared settings entry containing reusable connection and credential editors from every installed vendor.
- Capability settings: embedding, reranking, text-to-speech, speech-to-text, image generation, and decisions.
- Language models: route and model status, probes, and provider editors.
- Concurrency: shared-resource limits, route/capability assignment, and live queue state.

## Vendor-owned slot content

- OpenAI-compatible: connection editor in Providers; capability defaults, routes, models, reasoning levels, sampling, discovery, and timeouts in service pages.
- Jina: connection editor in Providers; reranking and embedding models and timeout in service pages.
- TypeSafe: connection editor in Providers; decision model, longer-context switch, and timeout in the Decisions page.
- Anthropic: connection editor in Providers; Messages API routes, model ids, native route JSON, version, and timeout in Language models.
- Ollama and Cohere: connection editors in Providers; models and capability options in service pages.
- LocalAI: connection editor in Providers; models, native request fields, image controls, and routes in service pages.

## Outside this audit

- DSH settings navigation, page frame, form persistence chrome, shared primitives, model picker, and shell theming.
- Provider services, transports, API behavior, and consumer-plugin UI.
- Documentation-site presentation.
