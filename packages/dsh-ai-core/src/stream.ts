/**
 * The text of a response body as it arrives. The read is raced against the signal, so a fetch that ignores its
 * own cancellation still ends; `activity` is called for every part received, for a silence watchdog.
 */
async function* decoded(body: ReadableStream<Uint8Array>, activity: () => void, signal: AbortSignal | undefined): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let abort: (() => void) | undefined
  const aborted = signal === undefined ? undefined : new Promise<never>((_, reject) => {
    abort = () => { reject(signal.reason) }
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
  aborted?.catch(() => undefined)
  try {
    while (true) {
      const part = aborted === undefined ? await reader.read() : await Promise.race([reader.read(), aborted])
      if (part.done) break
      activity()
      yield decoder.decode(part.value, { stream: true })
    }
    const rest = decoder.decode()
    if (rest !== '') yield rest
  } finally {
    if (abort !== undefined) signal?.removeEventListener('abort', abort)
    try { await reader.cancel() } catch { /* the stream is already closed */ }
  }
}

const dataOf = (event: string): string => event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')

/** The `data:` payload of every event of a server-sent event stream, without framing. A sentinel such as `[DONE]` is passed through. */
export async function* sseData(body: ReadableStream<Uint8Array>, activity: () => void = () => undefined, signal?: AbortSignal): AsyncGenerator<string> {
  let buffer = ''
  for await (const text of decoded(body, activity, signal)) {
    buffer += text
    let at: number
    while ((at = buffer.search(/\r?\n\r?\n/)) >= 0) {
      const data = dataOf(buffer.slice(0, at))
      buffer = buffer.slice(at).replace(/^\r?\n\r?\n/, '')
      if (data !== '') yield data
    }
  }
  const rest = dataOf(buffer)
  if (rest !== '') yield rest
}

/** Every non-empty line of a newline-delimited stream (NDJSON), as the text of one value. */
export async function* ndjsonLines(body: ReadableStream<Uint8Array>, activity: () => void = () => undefined, signal?: AbortSignal): AsyncGenerator<string> {
  let buffer = ''
  for await (const text of decoded(body, activity, signal)) {
    buffer += text
    let at: number
    while ((at = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, at).trim()
      buffer = buffer.slice(at + 1)
      if (line !== '') yield line
    }
  }
  const rest = buffer.trim()
  if (rest !== '') yield rest
}
