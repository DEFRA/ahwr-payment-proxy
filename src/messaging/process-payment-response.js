import { updatePaymentResponse } from '../repositories/payment-repository.js'
import util from 'node:util'
import { Status } from '../constants/index.js'
import { trackError, trackEvent } from '../common/helpers/logging/logger.js'
import { metricsCounter } from '../common/helpers/metrics.js'

export const processPaymentResponse = async (logger, db, message, receiver) => {
  try {
    await metricsCounter(`payment_response_message_received`)

    const messageBody = message.body
    const paymentRequest = messageBody?.paymentRequest
    const agreementNumber = paymentRequest?.agreementNumber
    logger.setBindings({ reference: agreementNumber })
    const status = messageBody?.accepted
      ? Status.ACK
      : failedPaymentRequest(logger, messageBody)

    if (paymentRequest && agreementNumber) {
      logger.info(
        `received process payments response ${agreementNumber} ${status}`
      )
      if (paymentRequest?.value) {
        paymentRequest.value = paymentRequest.value / 100
      }
      if (
        paymentRequest?.invoiceLines?.length > 0 &&
        paymentRequest?.invoiceLines[0]?.value
      ) {
        paymentRequest.invoiceLines[0].value =
          paymentRequest.invoiceLines[0].value / 100
      }
      await updatePaymentResponse(db, agreementNumber, status, paymentRequest)

      await receiver.completeMessage(message)
    } else {
      trackError(
        logger,
        new Error('No payment request or agreement number'),
        'failed-process',
        'No payment request or agreement number in payments response',
        {
          reason: message.body
            ? util.inspect(message.body, false, null, false)
            : 'No message body'
        }
      )
      await receiver.deadLetterMessage(message)
      return
    }

    trackEvent(logger, 'process-payment', 'payment-response', {
      reason: status,
      reference: agreementNumber,
      kind: `value: ${paymentRequest?.value}`
    })
  } catch (err) {
    trackError(
      logger,
      err,
      'failed-process',
      'Failed to process payment response'
    )
    await receiver.deadLetterMessage(message)
  }
}

function failedPaymentRequest(logger, messageBody) {
  logger.error(
    `Failed payment request: ${util.inspect(messageBody, false, null, false)}`
  )
  trackError(
    logger,
    new Error(messageBody?.error),
    'failed-request',
    'Failed payment request'
  )
  return 'failed'
}
