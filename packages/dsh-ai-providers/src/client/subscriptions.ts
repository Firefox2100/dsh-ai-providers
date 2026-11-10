import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.remote` on the Client Context.
import type {} from '@deepseek-ai/dsh-api-remotes'

/**
 * The forwarded host events these pages care about: a settings document changed (the plugin's own configuration), DSH's
 * model routes changed, or a stored credential changed. All are on DSH's forwarded allowlist.
 */
export type PageEvent =
  | 'settings/document-updated'
  | 'llm/adapters-updated'
  | 'llm/models-updated'
  | 'credentials/record-updated'
  | 'credentials/reference-updated'

/**
 * What this file needs of `ctx.remote`. `$on`'s own signature narrows the event name through the declaring packages'
 * Cordis event augmentations; depending on three more DSH packages just to type five names is not worth it here, and an
 * event that is not forwarded simply never fires.
 */
interface ForwardedEvents {
  $on(event: string, listener: () => void): () => void
}

/**
 * Runs a refresh when DSH reports that what the page shows has changed. Pages subscribe instead of polling, so an edit
 * made anywhere — this window, another one, the agent itself — reaches them without asking the host on a timer.
 * @param ctx - the client plugin context.
 * @param events - forwarded host events that concern this page.
 * @param refresh - called once per event.
 */
export function refreshOn(ctx: Context, events: readonly PageEvent[], refresh: () => void): void {
  ctx.inject(['remote'], (remoteCtx) => {
    const remote = remoteCtx.remote as unknown as ForwardedEvents
    for (const event of events) {
      remoteCtx.effect(() => remote.$on(event, () => { refresh() }), `dsh-ai-providers: ${event}`)
    }
  })
}
