import {
  sendPaymentDataRequest,
  receivePaymentDataResponseMessages
} from '../messaging/fcp-messaging-service.js'
import { v4 as uuid } from 'uuid'
import { createBlobClient } from '../storage.js'

export const testPaymentStatus = async (logger) => {
  logger.info('Retrieving payment status')
  let receiver, responseMessage, blobUri, blobClient
  try {
    const frn = '1102420247'
    const reference = 'REDC-5S4F-7GNJ'

    const requestMessageId = uuid()
    const sessionId = uuid()
    const requestMessage = {
      category: 'frn',
      value: frn
    }

    await sendPaymentDataRequest(
      requestMessage,
      sessionId,
      logger,
      requestMessageId
    )

    const response = await receivePaymentDataResponseMessages(
      requestMessageId,
      1
    )

    logger.info(`Response: ${response.messages?.length}`)
    receiver = response.receiver
    if (!response.messages?.length) {
      throw new Error('No response messages received from payment data request')
    }

    responseMessage = response.messages[0]
    blobUri = responseMessage.body?.uri
    if (!blobUri) {
      throw new Error('No blob URI received in payment data response')
    }

    blobClient = createBlobClient(logger, blobUri)
    const blob = await blobClient.getBlob()
    const entry = blob.data.find(
      (blobData) => blobData.agreementNumber === reference
    )

    logger.info(`Retrieved payment status name: ${entry.status.name}`)
  } catch (error) {
    logger.error(
      { message: error.message, stack_trace: error.stack },
      'Failed to fetch payment status'
    )
  } finally {
    if (receiver) {
      if (responseMessage) {
        await receiver
          .completeMessage(responseMessage)
          .catch((error) =>
            logger.error(
              { error },
              `Error completing response message: ${JSON.stringify(responseMessage)}`
            )
          )
      }

      await receiver
        .close()
        .catch((error) =>
          logger.error({ error }, 'Error closing receiver connection')
        )
    }

    if (blobClient) {
      await blobClient
        .deleteBlob()
        .catch((error) =>
          logger.error({ error }, `Error deleting blob: ${blobUri}`)
        )
    }
  }
}
