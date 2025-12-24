import util from 'util'
import { processPaymentResponse } from './process-payment-response'
import { updatePaymentResponse } from '../repositories/payment-repository'
import { trackError } from '../common/helpers/logging/logger'

jest.mock('../repositories/payment-repository')
jest.mock('../common/helpers/logging/logger')

const mockErrorLogger = jest.fn()
const mockInfoLogger = jest.fn()
const mockedLogger = {
  error: mockErrorLogger,
  info: mockInfoLogger,
  setBindings: jest.fn()
}
const mockDb = jest.fn()

describe('Process payment response', () => {
  const agreementNumber = 'AA-1234-567'
  const mockReceiver = {
    completeMessage: jest.fn(),
    abandonMessage: jest.fn(),
    deadLetterMessage: jest.fn()
  }

  beforeEach(async () => {
    jest.clearAllMocks()
  })

  test('Successfully update the payment with success status', async () => {
    updatePaymentResponse.mockResolvedValueOnce()

    await processPaymentResponse(
      mockedLogger,
      mockDb,
      {
        body: {
          paymentRequest: {
            agreementNumber,
            value: 43600,
            invoiceLines: [
              {
                value: 43600
              }
            ]
          },
          accepted: true
        }
      },
      mockReceiver
    )

    expect(updatePaymentResponse).toHaveBeenCalledTimes(1)
    expect(updatePaymentResponse).toHaveBeenCalledWith(
      mockDb,
      agreementNumber,
      'ack',
      {
        agreementNumber,
        value: 436,
        invoiceLines: [
          {
            value: 436
          }
        ]
      }
    )
    expect(mockReceiver.completeMessage).toHaveBeenCalledTimes(1)
  })

  test('Update the payment with failed status and raise exception', async () => {
    updatePaymentResponse.mockResolvedValueOnce()

    await processPaymentResponse(
      mockedLogger,
      mockDb,
      {
        body: {
          paymentRequest: {
            agreementNumber
          },
          accepted: false
        }
      },
      mockReceiver
    )

    expect(updatePaymentResponse).toHaveBeenCalledTimes(1)
    expect(mockReceiver.completeMessage).toHaveBeenCalledTimes(1)
    expect(mockErrorLogger).toHaveBeenCalledWith(
      `Failed payment request: ${util.inspect(
        {
          paymentRequest: {
            agreementNumber
          },
          accepted: false
        },
        false,
        null,
        false
      )}`
    )
  })

  test('response message deadLettered and error logged when no agreement number within message', async () => {
    await processPaymentResponse(
      mockedLogger,
      mockDb,
      {
        body: {
          paymentRequest: {},
          accepted: false
        }
      },
      mockReceiver
    )

    expect(mockErrorLogger).toHaveBeenCalledWith(
      `Received process payments response with no payment request and agreement number: ${util.inspect(
        {
          paymentRequest: {},
          accepted: false
        },
        false,
        null,
        false
      )}`
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledTimes(1)
    expect(updatePaymentResponse).toHaveBeenCalledTimes(0)
  })

  test('Exception tracked and error log output when input is empty message', async () => {
    await processPaymentResponse(mockedLogger, mockDb, {}, mockReceiver)

    expect(mockErrorLogger).toHaveBeenCalledTimes(2)
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledTimes(1)
    expect(updatePaymentResponse).toHaveBeenCalledTimes(0)
  })

  test('Message deadlettered and TrackException called when error thrown in updatePaymentResponse', async () => {
    const paymentRequest = { value: 0, agreementNumber }
    const accepted = 'ack'
    const error = new Error('Something wrong')
    updatePaymentResponse.mockRejectedValueOnce(error)

    await processPaymentResponse(
      mockedLogger,
      mockDb,
      { body: { paymentRequest, accepted } },
      mockReceiver
    )

    expect(trackError).toHaveBeenCalledWith(
      mockedLogger,
      error,
      'failed-process',
      'Failed to process payment response'
    )
    expect(updatePaymentResponse).toHaveBeenCalledWith(
      mockDb,
      agreementNumber,
      accepted,
      paymentRequest
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledTimes(1)
  })
})
