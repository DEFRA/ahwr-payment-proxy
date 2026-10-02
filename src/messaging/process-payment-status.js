import util from 'node:util'
import { PaymentHubStatus } from '../constants/index.js'
import { trackError } from '../common/helpers/logging/logger.js'
import { processPaidClaim } from '../jobs/request-payment-status.js'

const retrievePaymentTypeFromMessage = (messageType) => {
  const segments = messageType.split('.')
  return segments[segments.length - 1]
}

export const processUpdatePaymentStatus = async (
  logger,
  db,
  message,
  receiver
) => {
  try {
    const messageBody = message.body
    const claimReference = messageBody?.agreementNumber
    const messageType = messageBody?.type

    if (claimReference && messageType) {
      logger.info(`Received payment status: ${messageType} - ${claimReference}`)

      const retrievedMessageType = retrievePaymentTypeFromMessage(messageType)

      if (
        retrievedMessageType?.toLowerCase() ===
        PaymentHubStatus.SETTLED.toLowerCase()
      ) {
        await processPaidClaim(db, claimReference, logger)
      }

      await receiver.completeMessage(message)
    } else {
      trackError(
        logger,
        new Error(
          'Claim reference and/or message type not added in payment status'
        ),
        'failed-process',
        'No claim reference or message type in payments response',
        {
          reason: message.body
            ? util.inspect(message.body, false, null, false)
            : 'No message body'
        }
      )
      await receiver.deadLetterMessage(message)
    }
  } catch (err) {
    trackError(
      logger,
      err,
      'failed-process',
      'Failed to process payment status'
    )
    await receiver.deadLetterMessage(message)
  }
}
