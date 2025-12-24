import { config } from '../config.js'
import { requestPaymentStatus } from './request-payment-status.js'
import cron from 'node-cron'
import { trackError } from '../common/helpers/logging/logger.js'

const requestPaymentStatusScheduler = {
  plugin: {
    name: 'requestPaymentStatusScheduler',
    register: async (server) => {
      const { schedule, enabled } = config.get('requestPaymentStatusScheduler')
      const logger = server.logger.child({
        plugin: 'requestPaymentStatusScheduler'
      })

      if (!enabled) {
        logger.info(
          'Payment status scheduler is disabled. Skipping cron job registration.'
        )
        return
      }

      logger.info(
        `Registering payment status scheduler with schedule: ${schedule}`
      )

      cron.schedule(schedule, async () => {
        const taskLogger = logger.child({ task: 'requestPaymentStatus' })
        taskLogger.info('Starting payment status requests')

        try {
          await requestPaymentStatus(taskLogger, server.db)
          taskLogger.info('Successfully completed payment status requests')
        } catch (err) {
          trackError(
            taskLogger,
            err,
            'failed-request',
            'Failed to request payment statuses'
          )
        }
      })
    }
  }
}

export default requestPaymentStatusScheduler
