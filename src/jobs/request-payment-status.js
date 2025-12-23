import { config } from '../config.js'
import {
  getPendingPayments,
  incrementPaymentCheckCount,
  updatePaymentStatusByClaimRef
} from '../repositories/payment-repository.js'
import { v4 as uuid } from 'uuid'
import { PaymentHubStatus, Status } from '../constants/index.js'
import {
  sendPaymentDataRequest,
  receivePaymentDataResponseMessages
} from '../messaging/fcp-messaging-service.js'
import { publishPaymentUpdateEvent } from '../messaging/publish-outbound-notification.js'
import { createBlobClient } from '../storage.js'

const { moveClaimToPaidMsgType } = config.get('messageTypes')

const { initialAttempts: DAILY_RETRY_LIMIT } = config.get(
  'requestPaymentStatusScheduler'
)

const createPaymentDataRequest = (frn) => ({
  category: 'frn',
  value: frn
})

const processPaidClaim = async (db, claimReference, logger) => {
  const updatedPayment = await updatePaymentStatusByClaimRef(
    db,
    claimReference,
    Status.PAID
  )

  if (updatedPayment) {
    const {
      data: { sbi }
    } = updatedPayment
    await publishPaymentUpdateEvent(
      logger,
      {
        claimRef: claimReference,
        sbi
      },
      moveClaimToPaidMsgType
    )
  } else {
    logger.error('Payment not found to update paid status')
  }
}

const trackPaymentStatusError = ({
  claimReference,
  statuses,
  sbi,
  type,
  logger,
  paymentCheckCount
}) => {
  logger.info(
    { claimReference, sbi, type },
    `Payment has not been paid after ${paymentCheckCount} status requests`
  )

  // TODO replace
  logger.info({ statuses }, 'Status history')
  // appInsights.defaultClient.trackException({
  //   exception: new Error('Payment has not been updated to paid status'),
  //   properties: {
  //     claimReference,
  //     statuses,
  //     sbi,
  //     type
  //   }
  // })
}

const processPaymentDataEntry = async (db, paymentDataEntry, logger) => {
  const { agreementNumber: claimReference, status, events } = paymentDataEntry
  logger.info({ claimReference, status }, 'Processing data entry')

  if (status.name === PaymentHubStatus.SETTLED) {
    await processPaidClaim(db, claimReference, logger)
    return
  }

  const updatedPayment = await incrementPaymentCheckCount(db, claimReference)
  if (!updatedPayment) {
    logger.error(
      { claimReference },
      'No rows returned from incrementing paymentCheckCount'
    )
    return
  }

  const { paymentCheckCount: paymentCheckCountStr, data: { sbi } = {} } =
    updatedPayment
  const paymentCheckCount = Number(paymentCheckCountStr)
  const statuses = events.map((event) => ({
    status: event.status.name,
    date: event.timestamp
  }))

  if (paymentCheckCount === DAILY_RETRY_LIMIT) {
    trackPaymentStatusError({
      claimReference,
      statuses,
      sbi,
      type: 'INITIAL',
      logger,
      paymentCheckCount
    })
  }

  if (paymentCheckCount === DAILY_RETRY_LIMIT + 1) {
    trackPaymentStatusError({
      claimReference,
      statuses,
      sbi,
      type: 'FINAL',
      logger,
      paymentCheckCount
    })
  }
}

const processDataRequestResponse = async ({
  db,
  logger,
  claimReferences,
  blobClient
}) => {
  const blob = await blobClient.getBlob()

  const requestedPaymentData = blob.data.filter((blobData) =>
    claimReferences.has(blobData.agreementNumber)
  )
  if (!requestedPaymentData.length) {
    throw new Error('Blob does not contain requested payment data')
  }

  for (const entry of requestedPaymentData) {
    await processPaymentDataEntry(db, entry, logger)
  }
}

export const processFrnRequest = async (db, frn, logger, claimReferences) => {
  const requestMessageId = uuid()
  const sessionId = uuid()
  const requestMessage = createPaymentDataRequest(frn)
  let receiver, responseMessage, blobUri, blobClient

  try {
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

    await processDataRequestResponse({
      db,
      logger,
      claimReferences,
      blobClient
    })
  } catch (err) {
    logger.error({ err }, 'Error requesting payment status')
  } finally {
    if (receiver) {
      if (responseMessage) {
        await receiver
          .completeMessage(responseMessage)
          .catch((err) =>
            logger.error(
              { err, responseMessage },
              'Error completing response message'
            )
          )
      }

      await receiver
        .close()
        .catch((err) =>
          logger.error({ err }, 'Error closing receiver connection')
        )
    }

    if (blobClient) {
      await blobClient
        .deleteBlob()
        .catch((err) => logger.error({ err, blobUri }, 'Error deleting blob'))
    }
  }
}

export const requestPaymentStatus = async (logger, db) => {
  const uniqueFrns = new Set()
  const claimReferences = new Set()

  const pendingPayments = await getPendingPayments(db)

  logger.info(`Found ${pendingPayments.length} pending payments`)

  for (const pendingPayment of pendingPayments) {
    uniqueFrns.add(pendingPayment.frn)
    claimReferences.add(pendingPayment.applicationReference)
  }

  for (const frn of uniqueFrns) {
    await processFrnRequest(db, frn, logger.child({ frn }), claimReferences)
  }
}
