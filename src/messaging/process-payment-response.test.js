import util from 'util'
import { processPaymentResponse } from './process-payment-response.js'
import { updatePaymentResponse } from '../repositories/payment-repository.js'
import { trackError, trackEvent } from '../common/helpers/logging/logger.js'
import { metricsCounter } from '../common/helpers/metrics.js'

jest.mock('../repositories/payment-repository')
jest.mock('../common/helpers/logging/logger')
jest.mock('../common/helpers/metrics.js')

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
    expect(trackEvent).toHaveBeenCalledWith(
      mockedLogger,
      'process-payment',
      'payment-response',
      {
        kind: 'value: 436',
        reason: 'ack',
        reference: 'AA-1234-567'
      }
    )
    expect(metricsCounter).toHaveBeenCalledWith(
      'payment_response_message_received'
    )
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
    expect(metricsCounter).toHaveBeenCalledWith(
      'payment_response_message_received'
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
      'Failed payment request: { paymentRequest: {}, accepted: false }'
    )
    expect(trackError).toHaveBeenCalledWith(
      mockedLogger,
      expect.any(Error),
      'failed-process',
      'No payment request or agreement number in payments response',
      { reason: '{ paymentRequest: {}, accepted: false }' }
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledTimes(1)
    expect(updatePaymentResponse).toHaveBeenCalledTimes(0)
  })

  test('Exception tracked and error log output when input is empty message', async () => {
    await processPaymentResponse(mockedLogger, mockDb, {}, mockReceiver)

    expect(mockErrorLogger).toHaveBeenCalledTimes(1)
    expect(trackError).toHaveBeenCalledWith(
      mockedLogger,
      expect.any(Error),
      'failed-process',
      'No payment request or agreement number in payments response',
      { reason: 'No message body' }
    )
    expect(mockReceiver.deadLetterMessage).toHaveBeenCalledTimes(1)
    expect(updatePaymentResponse).toHaveBeenCalledTimes(0)
    expect(metricsCounter).toHaveBeenCalledWith(
      'payment_response_message_received'
    )
  })

  test('Message deadLettered and TrackError called when error thrown in updatePaymentResponse', async () => {
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
