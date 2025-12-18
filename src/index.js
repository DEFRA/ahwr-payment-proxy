import process from 'node:process'

import { getLogger } from './common/helpers/logging/logger.js'
import { startServer } from './common/helpers/start-server.js'

await startServer()

process.on('unhandledRejection', (error) => {
  const logger = getLogger()
  logger.error({ error }, 'Unhandled rejection')
  process.exitCode = 1
})
