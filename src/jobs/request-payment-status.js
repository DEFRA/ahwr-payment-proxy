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
import { trackError } from '../common/helpers/logging/logger.js'

const { moveClaimToPaidMsgType } = config.get('messageTypes')

const { initialAttempts: DAILY_RETRY_LIMIT } = config.get(
  'requestPaymentStatusScheduler'
)

const createPaymentDataRequest = (frn) => ({
  category: 'frn',
  value: `${frn}`
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
    logger.error(
      `Payment not found to update paid status. claimReference: ${claimReference}`
    )
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
  trackError(
    logger,
    new Error('Payment has not been paid'),
    'failed-process',
    'Payment has not been paid',
    {
      reference: `claimReference: ${claimReference}, sbi: ${sbi}`,
      reason: statuses,
      outcome: `Unresolved after ${type} check sequence - paymentCheckCount: ${paymentCheckCount}`
    }
  )
}

const processPaymentDataEntry = async (db, paymentDataEntry, logger) => {
  const { agreementNumber: claimReference, status, events } = paymentDataEntry
  logger.info(
    `Processing data entry. claimReference: ${claimReference}, status: ${status.name}`
  )

  if (status.name === PaymentHubStatus.SETTLED) {
    await processPaidClaim(db, claimReference, logger)
    return
  }

  const updatedPayment = await incrementPaymentCheckCount(db, claimReference)
  if (!updatedPayment) {
    logger.error(
      `No rows returned from incrementing paymentCheckCount. claimReference: ${claimReference}`
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

  const statusByClaimReference = new Map()

  for (const entry of requestedPaymentData) {
    await processPaymentDataEntry(db, entry, logger)
    statusByClaimReference.set(entry.agreementNumber, entry.status.name)
  }

  return statusByClaimReference
}

export const processFrnRequest = async (db, frn, logger, claimReferences) => {
  logger.info(
    `Processing frn request. frn: ${frn}, claimReferences: ${[...claimReferences].join(',')}`
  )

  const requestMessageId = uuid()
  const sessionId = uuid()
  const requestMessage = createPaymentDataRequest(frn)
  let receiver, responseMessage, blobUri, blobClient, statusByClaimReference

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
    logger.info(`Received ${response.messages?.length} messages`)

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

    statusByClaimReference = await processDataRequestResponse({
      db,
      logger,
      claimReferences,
      blobClient
    })
  } catch (error) {
    logger.error({ error }, 'Error requesting payment status')
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

  return statusByClaimReference
}

export const requestPaymentStatus = async (logger, db) => {
  const claimReferencesByFrn = new Map()

  const pendingPayments = await getPendingPayments(db)

  logger.info(`Found ${pendingPayments.length} pending payments`)

  for (const pendingPayment of pendingPayments) {
    const { frn, reference } = pendingPayment

    if (!claimReferencesByFrn.has(frn)) {
      claimReferencesByFrn.set(frn, new Set())
    }

    claimReferencesByFrn.get(frn).add(reference)
  }

  for (const [frn, claimReferences] of claimReferencesByFrn.entries()) {
    await processFrnRequest(db, frn, logger, claimReferences)
  }
}
