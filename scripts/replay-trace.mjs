#!/usr/bin/env node
// Replays the language-model calls recorded in a trace file (traceWire on): lists them, or sends one recorded body again.
//   node scripts/replay-trace.mjs <trace.jsonl> [--list] [--span <id prefix>] [--url <base>/chat/completions]
//        [--set key=value ...] [--times N] [--key-env NAME]
// --set changes one top-level field of the body (a number, true/false, or text); everything else is sent as recorded.
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const file = args.find(arg => !arg.startsWith("--"))
const option = (name) => { const at = args.indexOf(`--${name}`); return at === -1 ? undefined : args[at + 1] }
const options = (name) => args.flatMap((arg, at) => (arg === `--${name}` ? [args[at + 1]] : []))

if (!file) { console.error('usage: replay-trace.mjs <trace.jsonl> [--list] [--span id] [--url endpoint] [--set key=value] [--times N] [--key-env NAME]'); process.exit(2) }

const spans = readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).flatMap(item => (item.type === 'span' ? [item.span] : []))
const calls = spans.filter(span => span.kind === 'generation')

if (args.includes('--list') || option('span') === undefined) {
  for (const span of calls) {
    const seconds = ((span.endMs - span.startMs) / 1000).toFixed(1)
    console.log(`${span.spanId}  ${span.model ?? ''}  ${seconds}s  wire=${span.wire === undefined ? 'no' : `${span.wire.length} chars`}  ${span.level === 'ERROR' ? `ERROR ${span.statusMessage}` : ''}`)
  }
  process.exit(0)
}

const span = calls.find(candidate => candidate.spanId.startsWith(option('span')))
if (!span) { console.error(`no generation starts with ${option('span')}`); process.exit(1) }
if (span.wire === undefined) { console.error('that call has no recorded body: switch "Keep the exact request" on and capture whole inputs (not a summary) before recording'); process.exit(1) }
if (/… \(\d+ characters\)$/.test(span.wire)) { console.error('the recorded body was cut by the summary length: record with whole inputs and outputs'); process.exit(1) }

const url = option('url')
if (!url) { console.error('--url is required (the full endpoint, such as http://localhost:8080/v1/chat/completions)'); process.exit(2) }
const body = JSON.parse(span.wire)
for (const setting of options('set')) {
  const [key, ...rest] = setting.split('=')
  const text = rest.join('=')
  body[key] = text === 'true' ? true : text === 'false' ? false : text !== '' && !Number.isNaN(Number(text)) ? Number(text) : text
}
const times = Number(option('times') ?? 1)
const headers = { 'content-type': 'application/json', accept: 'text/event-stream' }
const key = option('key-env') ? process.env[option('key-env')] : undefined
if (key) headers.authorization = `Bearer ${key}`

for (let run = 1; run <= times; run += 1) {
  const started = Date.now()
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!response.ok) { console.log(`#${run} HTTP ${response.status} ${(await response.text()).slice(0, 200)}`); continue }
  let text = '', calls = 0, finish = '', tokens = ''
  const decoder = new TextDecoder()
  let pending = ''
  for await (const part of response.body) {
    pending += decoder.decode(part, { stream: true })
    const lines = pending.split('\n'); pending = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:') || line.includes('[DONE]')) continue
      try {
        const data = JSON.parse(line.slice(5))
        const choice = data.choices?.[0]
        if (choice?.delta?.content) text += choice.delta.content
        if (choice?.delta?.tool_calls) calls += choice.delta.tool_calls.filter(call => call.function?.name).length
        if (choice?.finish_reason) finish = choice.finish_reason
        if (data.usage) tokens = `${data.usage.prompt_tokens} in, ${data.usage.completion_tokens} out`
      } catch { /* a partial line */ }
    }
  }
  console.log(`#${run} ${((Date.now() - started) / 1000).toFixed(1)}s finish=${finish || '?'} tool_calls=${calls} text=${text.length} chars ${tokens}`)
}
