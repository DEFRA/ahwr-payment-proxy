import { bootstrap } from 'global-agent'

import { getLogger } from '../logging/logger.js'
import { config } from '../../../config.js'

const logger = getLogger()

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for a number of http clients.
 */
export function setupProxy() {
  const proxyUrl = config.get('httpProxy')

  if (proxyUrl) {
    logger.info('setting up global proxies')

    // global-agent (axios/request/and others)
    bootstrap()
    globalThis.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
  }
}
