/** The `data:` payloads of a server-sent event stream, one per event, without the framing. `[DONE]` is passed through as is. */
export async function * sseData(body: ReadableStream<Uint8Array>, activity: () => void = () => undefined, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader()
  const aborted = signal === undefined ? undefined : new Promise<never>((_, reject) => { signal.addEventListener('abort', () => { reject(signal.reason) }, { once: true }) })
  aborted?.catch(() => undefined)
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const part = aborted === undefined ? await reader.read() : await Promise.race([reader.read(), aborted])
      if (part.done) break
      activity()
      buffer += decoder.decode(part.value, { stream: true })
      let at: number
      while ((at = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const event = buffer.slice(0, at)
        buffer = buffer.slice(at).replace(/^\r?\n\r?\n/, '')
        const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')
        if (data !== '') yield data
      }
    }
    buffer += decoder.decode()
    const rest = buffer.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')
    if (rest !== '') yield rest
  } finally {
    try { await reader.cancel() } catch { /* the stream is already closed */ }
  }
}
