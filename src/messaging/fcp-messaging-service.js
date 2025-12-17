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

export const sendPaymentRequest = async (paymentRequest) => {
  const { submitPaymentRequestMsgType, paymentRequestTopic } =
    config.get('serviceBus')

  const message = createMessage(paymentRequest, submitPaymentRequestMsgType)
  fcpMessageClient.sendMessage(message, paymentRequestTopic)
}

export const sendPaymentDataRequest = async (paymentDataRequest) => {
  const { submitPaymentDataRequestMsgType, paymentDataRequestTopic } =
    config.get('serviceBus')

  const message = createMessage(
    paymentDataRequest,
    submitPaymentDataRequestMsgType
  )
  fcpMessageClient.sendMessage(message, paymentDataRequestTopic)
}

export const receivePaymentDataResponseMessages = async (sessionId, count) => {
  const { paymentDataRequestResponseQueue } = config.get('serviceBus')

  return fcpMessageClient.receiveSessionMessages(
    paymentDataRequestResponseQueue,
    sessionId,
    count
  )
}

const createMessage = (body, type) => {
  return {
    body,
    type,
    source: 'ahwr-payment-proxy',
    options: {}
  }
}
