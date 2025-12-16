import { processApplicationPaymentRequest } from './process-application-payment-request.js'
import { savePaymentRequest } from './save-payment-request.js'
import { sendPaymentRequest } from './fcp-messaging-service.js'

jest.mock('./save-payment-request.js')
jest.mock('./fcp-messaging-service.js')

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
    savePaymentRequest.mockResolvedValueOnce()
    sendPaymentRequest.mockResolvedValueOnce()

    await processApplicationPaymentRequest(
      mockedLogger,
      {
        body: {
          applicationPaymentRequest
        }
      },
      receiver
    )

    expect(savePaymentRequest).toHaveBeenCalledTimes(1)
    expect(sendPaymentRequest).toHaveBeenCalledTimes(1)
    expect(mockedLogger.setBindings).toHaveBeenCalledTimes(1)
    expect(mockedLogger.info).toHaveBeenCalledTimes(2)
  })

  test('logger.error raised due to error thrown in updateByReference', async () => {
    savePaymentRequest.mockRejectedValueOnce(new Error('Error saving payment'))

    await expect(
      processApplicationPaymentRequest(mockedLogger, {}, receiver)
    ).rejects.toThrow('Error saving payment')

    expect(mockedLogger.error).toHaveBeenCalledTimes(1)
  })
})
