import { createServiceBusClient } from 'ffc-ahwr-common-library'
import { config } from '../config.js'
import { processPaymentResponse } from './process-payment-response.js'

let fcpMessageClient

export const startMessagingService = async (logger, db) => {
  const {
    host,
    username,
    password,
    paymentResponseTopic,
    paymentResponseSubscription
  } = config.get('serviceBus')

  fcpMessageClient = createServiceBusClient({
    host,
    username,
    password,
    proxyUrl: config.get('httpProxy')
  })

  fcpMessageClient.subscribeTopic({
    topicName: paymentResponseTopic,
    subscriptionName: paymentResponseSubscription,
    processMessage: (message, receiver) =>
      processPaymentResponse(logger, db, message, receiver),
    processError: (args) => {
      logger.error(args.error, 'Error subscribing to topic')
    }
  })
}

export const stopMessagingService = async () => {
  if (fcpMessageClient) {
    await fcpMessageClient.close()
  }
}

export const sendPaymentRequest = async (paymentRequest, sessionId, logger) => {
  const { submitPaymentRequestMsgType, paymentRequestTopic } =
    config.get('serviceBus')
  const sendPaymentRequestOutbound = config.get('sendPaymentRequestOutbound')

  if (sendPaymentRequestOutbound) {
    const message = createMessage(paymentRequest, submitPaymentRequestMsgType, {
      sessionId
    })
    fcpMessageClient.sendMessage(message, paymentRequestTopic)
    logger.info('Payment request sent.')
  } else {
    logger.info(
      `Payment integration is disabled, not sending payment request out.\n ${JSON.stringify(paymentRequest)}`
    )
  }
}

export const sendPaymentDataRequest = async (
  paymentDataRequest,
  sessionId,
  logger,
  messageId
) => {
  logger.info({ messageId, sessionId }, 'Sending payment data request')
  const { submitPaymentDataRequestMsgType, paymentDataRequestTopic } =
    config.get('serviceBus')

  const message = createMessage(
    paymentDataRequest,
    submitPaymentDataRequestMsgType,
    { sessionId, messageId }
  )
  fcpMessageClient.sendMessage(message, paymentDataRequestTopic)

  logger.info({ messageId, sessionId }, 'Sent payment data request')
}

export const receivePaymentDataResponseMessages = async (sessionId, count) => {
  const { paymentDataRequestResponseQueue } = config.get('serviceBus')

  return fcpMessageClient.receiveSessionMessages(
    paymentDataRequestResponseQueue,
    sessionId,
    count
  )
}

const createMessage = (body, type, options) => {
  return {
    body,
    type,
    source: 'ahwr-payment-proxy',
    ...options
  }
}
