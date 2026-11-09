import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.credentials` and the `loader/volatile-update` event.
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@dsh-ai-providers/core'
import type { Config } from '../config.ts'
import { JsonlSink, LangfuseSink } from './sinks.ts'
import { Tracer, type TraceSink } from './tracer.ts'

const dshHome = (): string => process.env['DSH_HOME'] ?? join(homedir(), '.dsh')

function patterns(sources: readonly string[], onProblem: (message: string) => void): RegExp[] {
  const found: RegExp[] = []
  for (const source of sources) {
    try { found.push(new RegExp(source, 'g')) } catch { onProblem(`the trace redaction pattern "${source}" is not a regular expression and is ignored`) }
  }
  return found
}

/**
 * Builds the tracer from the configuration (read live) and keeps `ctx.aiTrace` on the context while capture is on.
 * Records are written by the sinks the configuration names: files, a Langfuse server, or both.
 */
export function createTracer(ctx: Context, config: Config, onProblem: (message: string) => void): Tracer {
  ctx.provide('aiTrace')
  const keyOf = async (ref: string): Promise<string | undefined> => {
    const credentials = ctx.get('credentials')
    if (credentials === undefined) return undefined
    return (await credentials.resolve(credentialRef(ref)))?.value
  }
  const jsonl = new JsonlSink(() => config.traceDirectory.get() || join(dshHome(), 'traces'))
  const langfuse = new LangfuseSink({
    host: () => config.langfuseHost.get(),
    environment: () => config.langfuseEnvironment.get(),
    keys: async () => {
      const [publicKey, secretKey] = await Promise.all([keyOf(config.langfusePublicKeyRef.get()), keyOf(config.langfuseSecretKeyRef.get())])
      return publicKey === undefined || secretKey === undefined ? undefined : { publicKey, secretKey }
    },
  })
  const sinks = (): TraceSink[] => {
    const wanted = config.traceSink.get()
    return [...wanted === 'langfuse' ? [] : [jsonl], ...wanted === 'jsonl' ? [] : [langfuse]]
  }
  let redact: RegExp[] = patterns(config.traceRedact.get(), onProblem)
  const problems = new Set<string>()
  const tracer = new Tracer({
    enabled: () => config.traceEnabled.get(),
    sinks,
    summaryChars: () => (config.traceCapture.get() === 'full' ? 0 : Math.max(1, config.traceSummaryChars.get())),
    redact: () => redact,
    wire: () => config.traceWire.get(),
    // A sink that keeps failing is told once, not on every batch.
    onProblem: (message) => { if (!problems.has(message)) { problems.add(message); onProblem(message) } },
  })
  const sync = (): void => {
    redact = patterns(config.traceRedact.get(), onProblem)
    const on = config.traceEnabled.get()
    const present = ctx.get('aiTrace') !== undefined
    if (on && !present) ctx.set('aiTrace', tracer)
    else if (!on && present) ctx.set('aiTrace', undefined as never)
  }
  sync()
  ctx.on('loader/volatile-update', sync)
  ctx.effect(() => async () => { ctx.set('aiTrace', undefined as never); await tracer.flush() }, 'dsh-ai-providers: trace')
  return tracer
}
