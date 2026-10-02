import { processUpdatePaymentStatus } from './process-payment-status.js'
import { processPaidClaim } from '../jobs/request-payment-status.js'
import { trackError } from '../common/helpers/logging/logger.js'

jest.mock('../jobs/request-payment-status.js')
jest.mock('../common/helpers/logging/logger.js')

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
}
const mockDb = jest.fn()

describe('Process payment status', () => {
  const mockReceiver = {
    completeMessage: jest.fn(),
    deadLetterMessage: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('processes paid claim and completes message when status is settled', async () => {
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.settled'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(processPaidClaim).toHaveBeenCalledWith(
      mockDb,
      'FUSH-1234-5678',
      mockLogger
    )
    expect(mockReceiver.completeMessage).toHaveBeenCalledWith(message)
    expect(mockReceiver.deadLetterMessage).not.toHaveBeenCalled()
  })

  test('completes message without processing paid claim when status is not settled', async () => {
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.ack'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(processPaidClaim).not.toHaveBeenCalled()
    expect(mockReceiver.completeMessage).toHaveBeenCalledWith(message)
  })

  test('dead letters message when claim reference or type is missing', async () => {
    const message = { body: { agreementNumber: 'FUSH-1234-5678' } }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(trackError).toHaveBeenCalled()
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
    expect(mockReceiver.completeMessage).not.toHaveBeenCalled()
  })

  test('dead letters message when processing fails', async () => {
    processPaidClaim.mockRejectedValueOnce(new Error('boom'))
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.settled'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(trackError).toHaveBeenCalledWith(
      mockLogger,
      expect.objectContaining({ message: 'boom' }),
      'failed-process',
      'Failed to process payment status'
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
    expect(mockReceiver.completeMessage).not.toHaveBeenCalled()
  })

  test('matches settled status case-insensitively', async () => {
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.SETTLED'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(processPaidClaim).toHaveBeenCalledWith(
      mockDb,
      'FUSH-1234-5678',
      mockLogger
    )
    expect(mockReceiver.completeMessage).toHaveBeenCalledWith(message)
  })

  test('logs received payment status', async () => {
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.settled'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Received payment status: uk.gov.defra.ffc.pay.settled - FUSH-1234-5678'
    )
  })

  test('dead letters message when claim reference is missing', async () => {
    const message = { body: { type: 'uk.gov.defra.ffc.pay.settled' } }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(processPaidClaim).not.toHaveBeenCalled()
    expect(trackError).toHaveBeenCalledWith(
      mockLogger,
      expect.objectContaining({
        message:
          'Claim reference and/or message type not added in payment status'
      }),
      'failed-process',
      'No claim reference or message type in payments response',
      { reason: "{ type: 'uk.gov.defra.ffc.pay.settled' }" }
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
  })

  test('dead letters message when message has no body', async () => {
    const message = {}

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(processPaidClaim).not.toHaveBeenCalled()
    expect(trackError).toHaveBeenCalledWith(
      mockLogger,
      expect.any(Error),
      'failed-process',
      'No claim reference or message type in payments response',
      { reason: 'No message body' }
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
    expect(mockReceiver.completeMessage).not.toHaveBeenCalled()
  })

  test('dead letters message when completing the message fails', async () => {
    mockReceiver.completeMessage.mockRejectedValueOnce(
      new Error('complete failed')
    )
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.ack'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(trackError).toHaveBeenCalledWith(
      mockLogger,
      expect.objectContaining({ message: 'complete failed' }),
      'failed-process',
      'Failed to process payment status'
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
  })
})
