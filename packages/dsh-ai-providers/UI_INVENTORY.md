# Provider UI inventory

## Runtime-owned surfaces

- Capability settings: embedding, reranking, text-to-speech, speech-to-text, and image generation.
- Language models: route and model status, probes, and provider editors.
- Concurrency: shared-resource limits, route/capability assignment, and live queue state.

## Vendor-owned slot content

- OpenAI-compatible: reusable connections, credentials, capability defaults, routes, models, reasoning levels, sampling, discovery, and timeouts.
- Jina / Cohere: reusable reranking connections, credentials, model, and timeout.
- Anthropic: reusable connections, credentials, Messages API routes, model ids, native route JSON, version, and timeout.
- LocalAI: explanatory hand-off to its OpenAI-compatible configuration.

## Outside this audit

- DSH settings navigation, page frame, form persistence chrome, shared primitives, model picker, and shell theming.
- Provider services, transports, API behavior, and consumer-plugin UI.
- Documentation-site presentation.
