export async function* sseData(body: ReadableStream<Uint8Array>, activity: () => void, signal: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      if (signal.aborted) throw signal.reason
      const part = await reader.read()
      if (part.done) break
      activity()
      buffer += decoder.decode(part.value, {stream: true})
      let at: number
      while ((at = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const frame = buffer.slice(0, at)
        buffer = buffer.slice(at).replace(/^\r?\n\r?\n/, '')
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n')
        if (data !== '') yield data
      }
    }
  } finally {
    try { await reader.cancel() } catch {}
  }
}
