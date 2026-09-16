import {
  requestPaymentStatusHandler,
  supportQueueMessagesHandler,
  supportApplyQueueActionsHandler,
  supportIsDeadLetterQueueHandler
} from './support-controller.js'
import { get } from '../../../repositories/payment-repository.js'
import Boom from '@hapi/boom'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'
import { trackEvent } from '../../../common/helpers/logging/logger.js'
import { sqsClient } from 'ffc-ahwr-common-library'
import { QueueDoesNotExist } from '@aws-sdk/client-sqs'

jest.mock('../../../repositories/payment-repository.js')
jest.mock('../../../jobs/request-payment-status.js')
jest.mock('../../../common/helpers/logging/logger.js')
jest.mock('ffc-ahwr-common-library', () => ({
  sqsClient: {
    setupClient: jest.fn(),
    peekMessages: jest.fn(),
    isDeadLetterQueue: jest.fn(),
    applyDlqActions: jest.fn()
  }
}))
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
    code: jest.fn().mockReturnThis(),
    takeover: jest.fn().mockReturnThis()
  }
  const mockDb = jest.fn()
  const mockLogger = {
    warn: jest.fn(),
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

    await expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Failed to retrieve payment'
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      'Failed to request payment status'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('should return 500 error when procesing frn request fails', async () => {
    get.mockRejectedValueOnce(new Error('Failed to process frn request'))

    await expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Failed to process frn request'
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      'Failed to request payment status'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('should rethrow boom error and log at error when repo throws Boom 400', async () => {
    get.mockRejectedValueOnce(
      Boom.badRequest('Failed to request payment status')
    )

    await expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Failed to request payment status'
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: expect.objectContaining({ isBoom: true }) },
      'Failed to request payment status'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('should rethrow boom error and log at error when repo throws Boom 401', async () => {
    get.mockRejectedValueOnce(Boom.unauthorized('Auth failed'))

    await expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Auth failed'
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: expect.objectContaining({ isBoom: true }) },
      'Failed to request payment status'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('should rethrow boom error and log at error when repo throws Boom 403', async () => {
    get.mockRejectedValueOnce(Boom.forbidden('Access denied'))

    await expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Access denied'
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: expect.objectContaining({ isBoom: true }) },
      'Failed to request payment status'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('should rethrow boom error and log at error when repo throws Boom 5xx', async () => {
    get.mockRejectedValueOnce(Boom.internal('Downstream exploded'))

    await expect(requestPaymentStatusHandler(request, mockH)).rejects.toThrow(
      'Downstream exploded'
    )
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: expect.objectContaining({ isBoom: true }) },
      'Failed to request payment status'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  test('should return 404 directly (no throw) and log at warn without an error field when payment does not exist', async () => {
    get.mockResolvedValueOnce(undefined)

    await requestPaymentStatusHandler(request, mockH)

    expect(get).toHaveBeenCalledWith(mockDb, 'REBC-J9AR-KILQ')
    expect(mockH.response).toHaveBeenCalledWith('Payment not found')
    expect(mockH.code).toHaveBeenCalledWith(404)
    expect(mockH.takeover).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { claimReference: 'REBC-J9AR-KILQ' },
      'Payment not found for support lookup'
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(processFrnRequest).not.toHaveBeenCalled()
  })
})

describe('supportQueueMessagesHandler', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  const mockRequest = {
    logger: mockLogger,
    query: { queueUrl: 'http://localhost:45666/queueName', limit: 10 }
  }
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    takeover: jest.fn().mockReturnThis()
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

  it('rethrows Boom 400 errors and logs at error', async () => {
    const boomError = Boom.badRequest('Invalid queue')
    sqsClient.peekMessages.mockRejectedValue(boomError)

    await expect(
      supportQueueMessagesHandler(mockRequest, mockH)
    ).rejects.toThrow(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: boomError },
      'Failed to get queue messages'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('rethrows Boom 401 (unauthorized) errors and logs at error', async () => {
    const boomError = Boom.unauthorized('Auth failed')
    sqsClient.peekMessages.mockRejectedValue(boomError)

    await expect(
      supportQueueMessagesHandler(mockRequest, mockH)
    ).rejects.toThrow(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: boomError },
      'Failed to get queue messages'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('rethrows Boom 403 (forbidden) errors and logs at error', async () => {
    const boomError = Boom.forbidden('Access denied')
    sqsClient.peekMessages.mockRejectedValue(boomError)

    await expect(
      supportQueueMessagesHandler(mockRequest, mockH)
    ).rejects.toThrow(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: boomError },
      'Failed to get queue messages'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('rethrows Boom 5xx errors and logs at error', async () => {
    const boomError = Boom.badImplementation('Downstream exploded')
    sqsClient.peekMessages.mockRejectedValue(boomError)

    await expect(
      supportQueueMessagesHandler(mockRequest, mockH)
    ).rejects.toThrow(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: boomError },
      'Failed to get queue messages'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('wraps unknown errors in Boom.internal and logs at error', async () => {
    const error = new Error('Unexpected')
    sqsClient.peekMessages.mockRejectedValue(error)

    await expect(
      supportQueueMessagesHandler(mockRequest, mockH)
    ).rejects.toThrow(Boom.internal(error))

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error },
      'Failed to get queue messages'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('returns 404 directly (no throw) and logs at warn without an error field when queue does not exist', async () => {
    const error = new QueueDoesNotExist({
      message: 'The specified queue does not exist.',
      $metadata: {}
    })
    sqsClient.peekMessages.mockRejectedValue(error)

    await supportQueueMessagesHandler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith(
      'Queue not found: http://localhost:45666/queueName'
    )
    expect(mockH.code).toHaveBeenCalledWith(404)
    expect(mockH.takeover).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { queueUrl: 'http://localhost:45666/queueName' },
      'Queue not found for support lookup'
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })
})

describe('supportApplyQueueActionsHandler', () => {
  const queueUrl = 'http://localhost:45666/queueName-dlq'
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  const mockRequest = {
    logger: mockLogger,
    payload: {
      queueUrl,
      actions: [
        { id: '1', action: 'delete' },
        { id: '2', action: 'reapply' }
      ]
    }
  }
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    takeover: jest.fn().mockReturnThis()
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('applies the actions to a dead-letter queue and returns the result', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(true)
    sqsClient.applyDlqActions.mockResolvedValue([
      { id: '1', action: 'delete', status: 'done' },
      { id: '2', action: 'reapply', status: 'done' }
    ])

    await supportApplyQueueActionsHandler(mockRequest, mockH)

    expect(sqsClient.setupClient).toHaveBeenCalledWith(
      'eu-west-2',
      'http://localhost:4566',
      mockLogger
    )
    expect(sqsClient.isDeadLetterQueue).toHaveBeenCalledWith(queueUrl)
    expect(sqsClient.applyDlqActions).toHaveBeenCalledWith(queueUrl, {
      1: 'delete',
      2: 'reapply'
    })
    expect(mockH.response).toHaveBeenCalledWith([
      { id: '1', action: 'delete', status: 'done' },
      { id: '2', action: 'reapply', status: 'done' }
    ])
    expect(mockH.code).toHaveBeenCalledWith(200)
  })

  it('returns 400 directly (no throw) and logs at warn without an error field when the queue is not a dlq', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(false)

    await supportApplyQueueActionsHandler(mockRequest, mockH)

    expect(sqsClient.applyDlqActions).not.toHaveBeenCalled()
    expect(mockH.response).toHaveBeenCalledWith(
      `Not a dead-letter queue: ${queueUrl}`
    )
    expect(mockH.code).toHaveBeenCalledWith(400)
    expect(mockH.takeover).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { queueUrl },
      'Queue actions requested on a non-dead-letter queue'
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('returns 404 directly (no throw) and logs at warn without an error field when queue does not exist', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(true)
    sqsClient.applyDlqActions.mockRejectedValue(
      new QueueDoesNotExist({
        message: 'The specified queue does not exist.',
        $metadata: {}
      })
    )

    await supportApplyQueueActionsHandler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith(`Queue not found: ${queueUrl}`)
    expect(mockH.code).toHaveBeenCalledWith(404)
    expect(mockH.takeover).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { queueUrl },
      'Queue not found for support action'
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('rethrows Boom errors and logs at error', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(true)
    const boomError = Boom.badRequest('Invalid')
    sqsClient.applyDlqActions.mockRejectedValue(boomError)

    await expect(
      supportApplyQueueActionsHandler(mockRequest, mockH)
    ).rejects.toThrow(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: boomError },
      'Failed to apply queue message actions'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('wraps unknown errors in Boom.internal and logs at error', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(true)
    const error = new Error('Unexpected')
    sqsClient.applyDlqActions.mockRejectedValue(error)

    await expect(
      supportApplyQueueActionsHandler(mockRequest, mockH)
    ).rejects.toThrow(Boom.internal(error))

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error },
      'Failed to apply queue message actions'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })
})

describe('supportIsDeadLetterQueueHandler', () => {
  const queueUrl = 'http://localhost:45666/queueName-dlq'
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  const mockRequest = {
    logger: mockLogger,
    query: { queueUrl }
  }
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    takeover: jest.fn().mockReturnThis()
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns true when the queue is a dead-letter queue', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(true)

    await supportIsDeadLetterQueueHandler(mockRequest, mockH)

    expect(sqsClient.setupClient).toHaveBeenCalledWith(
      'eu-west-2',
      'http://localhost:4566',
      mockLogger
    )
    expect(sqsClient.isDeadLetterQueue).toHaveBeenCalledWith(queueUrl)
    expect(mockH.response).toHaveBeenCalledWith({ isDlq: true })
    expect(mockH.code).toHaveBeenCalledWith(200)
  })

  it('returns false when the queue is not a dead-letter queue', async () => {
    sqsClient.isDeadLetterQueue.mockResolvedValue(false)

    await supportIsDeadLetterQueueHandler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({ isDlq: false })
    expect(mockH.code).toHaveBeenCalledWith(200)
  })

  it('returns 404 directly (no throw) and logs at warn without an error field when queue does not exist', async () => {
    sqsClient.isDeadLetterQueue.mockRejectedValue(
      new QueueDoesNotExist({
        message: 'The specified queue does not exist.',
        $metadata: {}
      })
    )

    await supportIsDeadLetterQueueHandler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith(`Queue not found: ${queueUrl}`)
    expect(mockH.code).toHaveBeenCalledWith(404)
    expect(mockH.takeover).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { queueUrl },
      'Queue not found for support lookup'
    )
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('wraps unknown errors in Boom.internal and logs at error', async () => {
    const error = new Error('Unexpected')
    sqsClient.isDeadLetterQueue.mockRejectedValue(error)

    await expect(
      supportIsDeadLetterQueueHandler(mockRequest, mockH)
    ).rejects.toThrow(Boom.internal(error))

    expect(mockLogger.error).toHaveBeenCalledWith(
      { error },
      'Failed to check if queue is a dead-letter queue'
    )
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })
})
