import { publishMessage, setupClient } from 'ffc-ahwr-common-library'
import { config } from '../config.js'
import { getLogger } from '../common/helpers/logging/logger.js'

let clientConfigured

export async function publishPaymentUpdateEvent(
  logger,
  messageBody,
  messageType
) {
  configureClient()

  const attributes = {
    eventType: messageType
  }

  await publishMessage(
    messageBody,
    attributes,
    config.get('sns.paymentUpdateTopicArn')
  )

  logger.info('Payment update event published')
}

function configureClient() {
  if (!clientConfigured) {
    setupClient(
      config.get('aws.region'),
      config.get('aws.endpointUrl'),
      getLogger(),
      'specify-topic-when-publishing'
    )
    clientConfigured = true
  }
}
