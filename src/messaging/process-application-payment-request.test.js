import { processApplicationPaymentRequest } from './process-application-payment-request.js'
import { savePaymentRequest } from './save-payment-request.js'
import { sendPaymentRequest } from './fcp-messaging-service.js'
import { trackError, trackEvent } from '../common/helpers/logging/logger.js'

jest.mock('./save-payment-request.js')
jest.mock('./fcp-messaging-service.js')
jest.mock('../common/helpers/logging/logger.js')

const mockedLogger = {
  info: jest.fn(),
  error: jest.fn(),
  setBindings: jest.fn()
}

describe('Process application payment request', () => {
  const reference = 'AA-1234-567'
  const applicationPaymentRequestMissingFrn = {
    reference,
    sbi: '123456789',
    whichReview: 'beef'
  }
  const applicationPaymentRequest = {
    ...applicationPaymentRequestMissingFrn,
    frn: '123456789'
  }

  const receiver = {
    completeMessage: jest.fn(),
    abandonMessage: jest.fn(),
    deadLetterMessage: jest.fn()
  }

  beforeEach(async () => {
    jest.clearAllMocks()
  })

  test('Successfully update the payment with success status', async () => {
    const paymentRequest = { id: 1 }
    savePaymentRequest.mockResolvedValueOnce(paymentRequest)
    sendPaymentRequest.mockResolvedValueOnce()

    await processApplicationPaymentRequest(
      mockedLogger,
      applicationPaymentRequest,
      receiver
    )

    expect(savePaymentRequest).toHaveBeenCalledTimes(1)
    expect(sendPaymentRequest).toHaveBeenCalledTimes(1)
    expect(mockedLogger.setBindings).toHaveBeenCalledTimes(1)
    expect(mockedLogger.info).toHaveBeenCalledTimes(2)
    expect(trackEvent).toHaveBeenCalledWith(
      mockedLogger,
      'process-payment',
      'payment-request',
      {
        reason: JSON.stringify(applicationPaymentRequest),
        kind: 'paymentRequest: {"id":1}'
      }
    )
  })

  test('logger.error raised due to error thrown in updateByReference', async () => {
    const error = new Error('Error saving payment')
    savePaymentRequest.mockRejectedValueOnce(error)

    await expect(
      processApplicationPaymentRequest(
        mockedLogger,
        {
          body: {
            reference: 'ABC123'
          },
          id: 'msg-001'
        },
        receiver
      )
    ).rejects.toThrow('Error saving payment')

    expect(trackError).toHaveBeenCalledWith(
      mockedLogger,
      error,
      'failed-process',
      'Failed to process application payment request',
      {
        reason: '{"reference":"ABC123"}',
        reference: 'agreementNo: ABC123 messageId: msg-001'
      }
    )
  })
})
