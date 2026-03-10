import {
  requestPaymentStatusHandler,
  supportQueueMessagesHandler
} from './support-controller.js'
import { get } from '../../../repositories/payment-repository.js'
import Boom from '@hapi/boom'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'
import { trackEvent } from '../../../common/helpers/logging/logger.js'
import { sqsClient } from 'ffc-ahwr-common-library'

jest.mock('../../../repositories/payment-repository.js')
jest.mock('../../../jobs/request-payment-status.js')
jest.mock('../../../common/helpers/logging/logger.js')
jest.mock('ffc-ahwr-common-library')
jest.mock('../../../config.js', () => {
  const actual = jest.requireActual('../../../config.js')

  return {
    config: {
      get: (key) => {
        if (key === 'aws.region') {
          return 'eu-west-2'
        }
        if (key === 'aws.endpointUrl') {
          return 'http://localhost:4566'
        }
        return actual.config.get(key)
      }
    }
  }
})

describe('updatePaymentHandler', () => {
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis()
  }
  const mockDb = jest.fn()
  const mockLogger = {
    error: jest.fn()
  }
  const request = {
    db: mockDb,
    logger: mockLogger,
    params: { claimReference: 'REBC-J9AR-KILQ' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should request payment status for claimReference', async () => {
    get.mockResolvedValueOnce({
      frn: '12345'
    })
    processFrnRequest.mockResolvedValueOnce(
      new Map([['REBC-J9AR-KILQ', 'Settled']])
    )

    await requestPaymentStatusHandler(request, mockH)

    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(processFrnRequest).toHaveBeenCalledWith(
      mockDb,
      '12345',
      mockLogger,
      new Set(['REBC-J9AR-KILQ'])
    )
    expect(get).toHaveBeenCalledWith(mockDb, 'REBC-J9AR-KILQ')
    expect(trackEvent).toHaveBeenCalledWith(
      mockLogger,
      'manual-request',
      'payment-status',
      { reference: 'REBC-J9AR-KILQ' }
    )
    expect(mockH.response).toHaveBeenCalledWith({
      status: 'Settled'
    })
  })

  test('should return 500 error when retrieving payment fails', async () => {
    get.mockRejectedValueOnce(new Error('Failed to retrieve payment'))

    expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Failed to retrieve payment'
    )
  })

  test('should return 500 error when procesing frn request fails', async () => {
    get.mockRejectedValueOnce(new Error('Failed to process frn request'))

    expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Failed to process frn request'
    )
  })

  test('should rethrow boom error when repo throws', async () => {
    get.mockRejectedValueOnce(
      Boom.badRequest('Failed to request payment status')
    )

    expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Failed to request payment status'
    )
  })

  test('should return 404 error when payment does not exist for reference', async () => {
    get.mockResolvedValueOnce(undefined)

    expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Payment not found'
    )
    expect(get).toHaveBeenCalledWith(mockDb, 'REBC-J9AR-KILQ')
  })
})

describe('supportQueueMessagesHandler', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  }
  const mockRequest = {
    logger: mockLogger,
    query: { queueUrl: 'http://localhost:45666/queueName', limit: 10 }
  }
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis()
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should retrieve messages and render them', async () => {
    sqsClient.peekMessages.mockResolvedValue([
      {
        id: '1',
        body: { sbi: '123456789', claimRef: 'FUBC-JTTU-SDQ7' },
        attributes: { attr: 'value' },
        messageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'uk.gov.ffc.ahwr.set.paid.status'
          }
        }
      }
    ])

    await supportQueueMessagesHandler(mockRequest, mockH)

    expect(sqsClient.setupClient).toHaveBeenCalledWith(
      'eu-west-2',
      'http://localhost:4566',
      mockLogger
    )
    expect(sqsClient.peekMessages).toHaveBeenCalledWith(
      'http://localhost:45666/queueName',
      10
    )
    expect(mockH.response).toHaveBeenCalledWith([
      {
        id: '1',
        body: { sbi: '123456789', claimRef: 'FUBC-JTTU-SDQ7' },
        attributes: { attr: 'value' },
        messageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'uk.gov.ffc.ahwr.set.paid.status'
          }
        }
      }
    ])
  })

  it('should return empty array when no messages', async () => {
    sqsClient.peekMessages.mockResolvedValue([])

    await supportQueueMessagesHandler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith([])
  })

  test('rethrows Boom errors', async () => {
    const boomError = Boom.badRequest('Invalid queue')
    sqsClient.peekMessages.mockRejectedValue(boomError)

    await expect(supportQueueMessagesHandler(mockRequest, mockH)).rejects.toThrow(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: boomError },
      'Failed to get queue messages'
    )
  })

  test('wraps unknown errors in Boom.internal', async () => {
    const error = new Error('Unexpected')
    sqsClient.peekMessages.mockRejectedValue(error)

    await expect(supportQueueMessagesHandler(mockRequest, mockH)).rejects.toThrow(Boom.internal(error))

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: error },
      'Failed to get queue messages'
    )
  })
})
