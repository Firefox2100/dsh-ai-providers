import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { CAPABILITIES } from '@dsh-ai-providers/core'
import type { GateRule } from './gate.ts'

/** Which provider supplies each capability, and how long a vector prepared ahead waits to be retrieved. Each field is edited in the settings UI. */
export interface Config {
  /** The id of the provider that supplies embedding; empty for none. */
  embedding: Volatile<string>
  /** The id of the provider that supplies reranking; empty for none. */
  rerank: Volatile<string>
  /** The id of the provider that supplies text-to-speech; empty for none. */
  tts: Volatile<string>
  /** The id of the provider that supplies speech-to-text; empty for none. */
  stt: Volatile<string>
  /** The id of the provider that supplies image generation; empty for none. */
  image: Volatile<string>
  /** The id of the provider that supplies decisions; empty for none. */
  decision: Volatile<string>
  /** How long a vector prepared with `prefetch` waits to be retrieved before it is dropped, in seconds. */
  holdSeconds: Volatile<number>
  /** The shared resources and how many calls each serves at once; calls beyond that wait their turn, people's before background work. Empty limits nothing. */
  limits: Volatile<GateRule[]>
  /** The longest a call waits for its turn before it fails, in seconds; 0 for no limit. */
  maxWaitSeconds: Volatile<number>
  /** The longest a call may keep its places, in seconds; one that holds them longer is let go of (and the log says so). 0 for no limit. */
  maxHoldSeconds: Volatile<number>
  /** Whether calls and the work around them are recorded (`ctx.aiTrace`). Traces hold whole prompts: keep them on a server you run yourself. */
  traceEnabled: Volatile<boolean>
  /** Where records go: `jsonl` (files), `langfuse` (a Langfuse server) or `both`. */
  traceSink: Volatile<string>
  /** `full` records inputs and outputs whole; `summary` cuts each to `traceSummaryChars`. */
  traceCapture: Volatile<string>
  /** What a text is cut to when only a summary is recorded. */
  traceSummaryChars: Volatile<number>
  /** The folder of the JSONL files; empty for `traces` in the DSH home. */
  traceDirectory: Volatile<string>
  /** Patterns (regular expressions) whose matches are replaced before anything is recorded. */
  traceRedact: Volatile<string[]>
  /** Keeps the exact request body of each language-model call, as the endpoint received it, so a call can be replayed. */
  traceWire: Volatile<boolean>
  /** The address of the Langfuse server. */
  langfuseHost: Volatile<string>
  /** Names the environment records belong to in Langfuse; empty for its default. */
  langfuseEnvironment: Volatile<string>
  /** The credential holding Langfuse's public key; the value is kept in the credential store, never here. */
  langfusePublicKeyRef: Volatile<string>
  /** The credential holding Langfuse's secret key. */
  langfuseSecretKeyRef: Volatile<string>
}

export const Config = z.object({
  embedding: z.string().default('').volatile(),
  rerank: z.string().default('').volatile(),
  tts: z.string().default('').volatile(),
  stt: z.string().default('').volatile(),
  image: z.string().default('').volatile(),
  decision: z.string().default('').volatile(),
  holdSeconds: z.natural().default(300).volatile(),
  limits: z.array(z.object({
    id: z.string().required(),
    max: z.natural().min(1).required(),
    reserve: z.natural().default(0),
    routes: z.array(z.string()).default([]),
    capabilities: z.array(z.union(CAPABILITIES.map(capability => z.const(capability)) as never)).default([]),
  })).default([]).volatile(),
  maxWaitSeconds: z.natural().default(1800).volatile(),
  maxHoldSeconds: z.natural().default(1800).volatile(),
  traceEnabled: z.boolean().default(false).volatile(),
  traceSink: z.union([z.const('jsonl'), z.const('langfuse'), z.const('both')]).default('jsonl').volatile(),
  traceCapture: z.union([z.const('full'), z.const('summary')]).default('summary').volatile(),
  traceSummaryChars: z.natural().default(500).volatile(),
  traceDirectory: z.string().default('').volatile(),
  traceWire: z.boolean().default(false).volatile(),
  traceRedact: z.array(z.string()).default([]).volatile(),
  langfuseHost: z.string().default('http://localhost:3000').volatile(),
  langfuseEnvironment: z.string().default('').volatile(),
  langfusePublicKeyRef: z.string().default('AI_PROVIDERS_LANGFUSE_PUBLIC_KEY').volatile(),
  langfuseSecretKeyRef: z.string().default('AI_PROVIDERS_LANGFUSE_SECRET_KEY').volatile(),
})
