import { randomUUID } from 'node:crypto'
import { savePaymentRequest } from './save-payment-request.js'
import { sendPaymentRequest } from './fcp-messaging-service.js'
import { trackError, trackEvent } from '../common/helpers/logging/logger.js'
import { metricsCounter } from '../common/helpers/metrics.js'

export const processApplicationPaymentRequest = async (
  logger,
  message,
  db,
  mongoClient
) => {
  logger.setBindings({ sbi: message.sbi, reference: message.reference })
  logger.info(`Received application payment request ${JSON.stringify(message)}`)
  await metricsCounter(`application_payment_request_message_received`)


  let paymentRequest
  const session = mongoClient.startSession()

  try {
    await session.startTransaction();

    paymentRequest = await savePaymentRequest(db, logger, message)
    await sendPaymentRequest(paymentRequest, randomUUID(), logger)
    session.commitTransaction()
    logger.info('Message processing successful')

    trackEvent(logger, 'process-payment', 'payment-request', {
      reason: JSON.stringify(message),
      kind: `paymentRequest: ${JSON.stringify(paymentRequest)}`
    })
  } catch (err) {
    await session.abortTransaction()
    trackError(
      logger,
      err,
      'failed-process',
      'Failed to process application payment request',
      {
        reference: `agreementNo: ${message.body?.reference ?? ''} messageId: ${message.id ?? ''}`,
        reason: message.body ? JSON.stringify(message.body) : ''
      }
    )
    throw err
  } finally {
    await session.endSession()
  }
}
