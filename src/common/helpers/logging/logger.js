import { pino } from 'pino'
import { loggerOptions } from './logger-options.js'

const logger = pino(loggerOptions)

function getLogger() {
  return logger
}

export { getLogger }
