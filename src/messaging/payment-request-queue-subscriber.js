import { config } from '../config.js'
import { SqsSubscriber } from 'ffc-ahwr-common-library'
import { getLogger } from '../common/helpers/logging/logger.js'
import { processApplicationPaymentRequest } from './process-application-payment-request.js'

let applicationPaymentRequestSubscriber

export async function configureAndStart(db) {
  const onMessage = async (message, attributes) => {
    const logger = getLogger().child({})
    logger.info(attributes, 'Received incoming message')
    await processApplicationPaymentRequest(logger, message, db)
  }

  applicationPaymentRequestSubscriber = new SqsSubscriber({
    queueUrl: config.get('sqs.applicationPaymentRequestQueueUrl'),
    logger: getLogger().child({}),
    region: config.get('aws.region'),
    awsEndpointUrl: config.get('aws.endpointUrl'),
    onMessage
  })
  await applicationPaymentRequestSubscriber.start()

  return onMessage
}

export async function stopSubscriber() {
  if (applicationPaymentRequestSubscriber) {
    await applicationPaymentRequestSubscriber.stop()
  }
}
