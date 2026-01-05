import {
  configureAndStart,
  stopSubscriber
} from './payment-request-queue-subscriber.js'
import { SqsSubscriber } from 'ffc-ahwr-common-library'
import { getLogger } from '../common/helpers/logging/logger.js'
import { config } from '../config.js'
import { processApplicationPaymentRequest } from './process-application-payment-request.js'

jest.mock('../common/helpers/logging/logger.js')
jest.mock('ffc-ahwr-common-library')
jest.mock('./process-application-payment-request.js')

describe('PaymentRequestQueueSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    config.set(
      'sqs.applicationPaymentRequestQueueUrl',
      'ahwr_payment_request_queue'
    )
    config.set('aws.region', 'eu-west-2')
    config.set('aws.endpointUrl', 'http://localhost:4576')
  })
  describe('configureAndStart', () => {
    it('should configure and start the SQS subscriber', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValueOnce(mockLogger)
      const mockDb = {}

      await configureAndStart(mockDb)

      expect(SqsSubscriber).toHaveBeenCalledTimes(1)
      expect(SqsSubscriber).toHaveBeenCalledWith({
        awsEndpointUrl: 'http://localhost:4576',
        logger: mockLogger.child(),
        region: 'eu-west-2',
        queueUrl: 'ahwr_payment_request_queue',
        onMessage: expect.any(Function)
      })
      expect(SqsSubscriber.mock.instances[0].start).toHaveBeenCalledTimes(1)
    })
    it('should pass message on via OnMessage function', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValue(mockLogger)
      processApplicationPaymentRequest.mockResolvedValueOnce()
      const mockDb = {}

      const onMessage = await configureAndStart(mockDb)

      await onMessage({ Message: 'test' }, { Attribute: 'value' })

      expect(processApplicationPaymentRequest).toHaveBeenCalledTimes(1)
    })
  })
  describe('stopSubscriber', () => {
    it('should stop the SQS subscriber', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValueOnce(mockLogger)
      const mockDb = {}

      await configureAndStart(mockDb)

      await stopSubscriber()

      const subscriberInstance = SqsSubscriber.mock.instances[0]

      expect(subscriberInstance.stop).toHaveBeenCalledTimes(1)
    })

    it('should do nothing if the SQS subscriber is not present', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValueOnce(mockLogger)

      await stopSubscriber()

      const subscriberInstance = SqsSubscriber.mock.instances[0]

      expect(subscriberInstance).toBeUndefined()
    })
  })
})
