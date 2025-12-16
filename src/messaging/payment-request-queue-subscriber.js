import { config } from '../config.js'
import { SqsSubscriber } from 'ffc-ahwr-common-library'
import { getLogger } from '../common/helpers/logging/logger.js'
import { processApplicationPaymentRequest } from './process-application-payment-request.js'

let applicationPaymentRequestSubscriber

export async function configureAndStart(db) {
  applicationPaymentRequestSubscriber = new SqsSubscriber({
    queueUrl: config.get('sqs.applicationPaymentRequestQueueUrl'),
    logger: getLogger(),
    region: config.get('aws.region'),
    awsEndpointUrl: config.get('aws.endpointUrl'),
    async onMessage(message, attributes) {
      getLogger().info(attributes, 'Received incoming message')
      await processApplicationPaymentRequest(getLogger(), message, db)
    }
  })
  await applicationPaymentRequestSubscriber.start()
}

export async function stopSubscriber() {
  if (applicationPaymentRequestSubscriber) {
    await applicationPaymentRequestSubscriber.stop()
  }
}
