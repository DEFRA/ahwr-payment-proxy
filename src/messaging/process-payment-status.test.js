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
        agreementNumber: 'FUSH-1234-5678'
      },
      applicationProperties: {
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
        agreementNumber: 'FUSH-1234-5678'
      },
      applicationProperties: {
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

  test('dead letters message when type is only in the body', async () => {
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678',
        type: 'uk.gov.defra.ffc.pay.settled'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(processPaidClaim).not.toHaveBeenCalled()
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
  })

  test('dead letters message when processing fails', async () => {
    processPaidClaim.mockRejectedValueOnce(new Error('boom'))
    const message = {
      body: {
        agreementNumber: 'FUSH-1234-5678'
      },
      applicationProperties: {
        type: 'uk.gov.defra.ffc.pay.settled'
      }
    }

    await processUpdatePaymentStatus(mockLogger, mockDb, message, mockReceiver)

    expect(trackError).toHaveBeenCalled()
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledWith(message)
  })
})
