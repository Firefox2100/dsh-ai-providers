declare module 'ws' {
  export class WebSocket {
    constructor(url: string, options?: { headers?: Record<string, string> })
  }
}
