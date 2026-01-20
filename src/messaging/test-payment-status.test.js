import { testPaymentStatus } from './test-payment-status.js'
import {
  sendPaymentDataRequest,
  receivePaymentDataResponseMessages
} from '../messaging/fcp-messaging-service.js'
import { createBlobClient } from '../storage.js'
import { v4 as uuid } from 'uuid'

jest.mock('../messaging/fcp-messaging-service.js')
jest.mock('../storage.js')
jest.mock('uuid')

describe('testPaymentStatus', () => {
  let logger
  let receiver
  let blobClient

  beforeEach(() => {
    jest.resetAllMocks()

    uuid.mockReturnValue('test-uuid')

    logger = {
      info: jest.fn(),
      error: jest.fn()
    }

    receiver = {
      completeMessage: jest.fn().mockResolvedValue(),
      close: jest.fn().mockResolvedValue()
    }

    blobClient = {
      getBlob: jest.fn().mockResolvedValue({
        data: [
          {
            agreementNumber: 'REDC-5S4F-7GNJ',
            status: { name: 'Paid' }
          }
        ]
      }),
      deleteBlob: jest.fn().mockResolvedValue()
    }

    createBlobClient.mockReturnValue(blobClient)

    receivePaymentDataResponseMessages.mockResolvedValue({
      receiver,
      messages: [
        {
          body: {
            uri: 'https://blob.test/payment.json'
          }
        }
      ]
    })
  })

  it('logs payment status when response and blob are valid', async () => {
    await testPaymentStatus(logger)

    expect(sendPaymentDataRequest).toHaveBeenCalledTimes(1)
    expect(receivePaymentDataResponseMessages).toHaveBeenCalledWith(
      'test-uuid',
      1
    )

    expect(createBlobClient).toHaveBeenCalledWith(
      logger,
      'https://blob.test/payment.json'
    )

    expect(blobClient.getBlob).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(
      'Retrieved payment status name: Paid'
    )

    expect(receiver.completeMessage).toHaveBeenCalled()
    expect(receiver.close).toHaveBeenCalled()
    expect(blobClient.deleteBlob).toHaveBeenCalled()
  })

  it('logs an error when no response messages are returned', async () => {
    receivePaymentDataResponseMessages.mockResolvedValue({
      receiver,
      messages: []
    })

    await testPaymentStatus(logger)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No response messages received from payment data request'
      }),
      'Failed to fetch payment status'
    )

    expect(receiver.close).toHaveBeenCalled()
  })
})
