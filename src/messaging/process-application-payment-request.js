import { v4 as uuidv4 } from 'uuid'
import { savePaymentRequest } from './save-payment-request.js'
import { sendPaymentRequest } from './fcp-messaging-service.js'

export const processApplicationPaymentRequest = async (logger, message, db) => {
  try {
    logger.setBindings({ sbi: message.sbi, reference: message.reference })
    logger.info(
      `Received application payment request ${JSON.stringify(message)}`
    )

    const paymentRequest = await savePaymentRequest(db, logger, message)

    await sendPaymentRequest(paymentRequest, uuidv4(), logger)

    logger.info('Message processing successful')
  } catch (err) {
    // TODO replace
    // appInsights.defaultClient.trackException({
    //   exception: err ?? new Error('unknown'),
    //   properties: {
    //     agreementNo: message.body?.reference ?? '',
    //     payload: message.body ?? '',
    //     messageId: message.id ?? ''
    //   }
    // })
    logger.error(`Unable to process application payment request: ${err}`)
    throw err
  }
}
