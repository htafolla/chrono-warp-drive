import { Hono, type Context } from 'hono'
import { devSeedRouteAllowed } from './containerOrigin.js'

export const DEV_SEED_DISABLED_ERROR = 'Dev seed route is disabled'

/**
 * Registers POST /dev/seed-containers.
 * Returns 403 unless NODE_ENV is not production and ALLOW_SEED_ROUTE=1.
 * The handler is only invoked when the gate is open. It must not change
 * on-chain payloads; the gate itself never writes.
 */
export function mountDevSeedRoute(
  app: Hono,
  handler: (c: Context) => Promise<Response>,
): void {
  app.post('/dev/seed-containers', async (c: Context) => {
    if (!devSeedRouteAllowed()) {
      return c.json({ success: false, error: DEV_SEED_DISABLED_ERROR }, 403)
    }
    return handler(c)
  })
}
