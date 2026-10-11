import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { CAPABILITIES } from 'dsh-ai-core'
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
  /** How long a vector prepared with `prefetch` waits to be retrieved before it is dropped, in seconds. */
  holdSeconds: Volatile<number>
  /** The shared resources and how many calls each serves at once; calls beyond that wait their turn, people's before background work. Empty limits nothing. */
  limits: Volatile<GateRule[]>
  /** The longest a call waits for its turn before it fails, in seconds; 0 for no limit. */
  maxWaitSeconds: Volatile<number>
  /** The longest a call may keep its places, in seconds; one that holds them longer is let go of (and the log says so). 0 for no limit. */
  maxHoldSeconds: Volatile<number>
}

export const Config = z.object({
  embedding: z.string().default('').volatile(),
  rerank: z.string().default('').volatile(),
  tts: z.string().default('').volatile(),
  stt: z.string().default('').volatile(),
  image: z.string().default('').volatile(),
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
})
