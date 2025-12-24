import {
  incrementPaymentCheckCount,
  updatePaymentStatusByClaimRef,
  getPendingPayments
} from '../repositories/payment-repository'
import { createBlobClient } from '../storage.js'
import { requestPaymentStatus } from '../jobs/request-payment-status'
import {
  receivePaymentDataResponseMessages,
  sendPaymentDataRequest
} from '../messaging/fcp-messaging-service.js'
import { trackError } from '../common/helpers/logging/logger.js'

jest.mock('../repositories/payment-repository')
jest.mock('../messaging/publish-outbound-notification.js')
jest.mock('../storage.js')
jest.mock('../messaging/fcp-messaging-service.js')
jest.mock('../common/helpers/logging/logger.js')

describe('requestPaymentStatus', () => {
  const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    setBindings: jest.fn(),
    child: jest.fn().mockReturnThis()
  }

  const completeMessageMock = jest.fn().mockResolvedValue()
  const closeConnectionMock = jest.fn().mockResolvedValue()
  const deleteBlobMock = jest.fn().mockResolvedValue()
  const getBlobMock = jest.fn()
  const dbMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    getBlobMock.mockResolvedValue({
      data: [
        {
          agreementNumber: 'RESH-F99F-E09F',
          status: { name: 'Settled' },
          sbi: '107021978'
        }
      ]
    })
    getPendingPayments.mockResolvedValue([
      {
        frn: '1234567890',
        applicationReference: 'RESH-F99F-E09F'
      }
    ])
    updatePaymentStatusByClaimRef.mockResolvedValue({
      data: { sbi: '107021978' }
    })
    receivePaymentDataResponseMessages.mockResolvedValue({
      receiver: {
        completeMessage: completeMessageMock,
        close: closeConnectionMock
      },
      messages: [{ body: { uri: 'blob://test-uri' } }]
    })
    createBlobClient.mockReturnValue({
      getBlob: getBlobMock,
      deleteBlob: deleteBlobMock
    })
  })

  test('should send request and process paid claim response', async () => {
    await requestPaymentStatus(loggerMock, dbMock)

    expect(sendPaymentDataRequest).toHaveBeenCalledWith(
      { category: 'frn', value: '1234567890' },
      expect.any(String),
      loggerMock,
      expect.any(String)
    )
    expect(completeMessageMock).toHaveBeenCalled()
    expect(closeConnectionMock).toHaveBeenCalled()
    expect(loggerMock.error).not.toHaveBeenCalled()
    expect(deleteBlobMock).toHaveBeenCalled()
    expect(getBlobMock).toHaveBeenCalled()
    expect(createBlobClient).toHaveBeenCalledWith(loggerMock, 'blob://test-uri')
  })

  test('logs error if blob URI is missing', async () => {
    receivePaymentDataResponseMessages.mockResolvedValue({
      receiver: {
        completeMessage: completeMessageMock,
        close: closeConnectionMock
      },
      messages: [{ body: {} }]
    })

    await requestPaymentStatus(loggerMock, dbMock)

    expect(loggerMock.error).toHaveBeenCalledWith(
      { err: new Error('No blob URI received in payment data response') },
      'Error requesting payment status'
    )
    expect(deleteBlobMock).not.toHaveBeenCalled()
    expect(completeMessageMock).toHaveBeenCalled()
  })

  test('logs error if receiveMessages returns empty array', async () => {
    receivePaymentDataResponseMessages.mockResolvedValue({
      receiver: {
        completeMessage: completeMessageMock,
        close: closeConnectionMock
      },
      messages: []
    })

    await requestPaymentStatus(loggerMock, dbMock)

    expect(loggerMock.error).toHaveBeenCalledWith(
      {
        err: new Error(
          'No response messages received from payment data request'
        )
      },
      'Error requesting payment status'
    )
  })

  test('logs error if blob does not contain requested payment data', async () => {
    getBlobMock.mockResolvedValue({
      data: [
        {
          agreementNumber: 'AAAA-F99F-E09F',
          status: { name: 'Settled' },
          sbi: '107021978'
        }
      ]
    })
    await requestPaymentStatus(loggerMock, dbMock)

    expect(loggerMock.error).toHaveBeenCalledWith(
      { err: new Error('Blob does not contain requested payment data') },
      'Error requesting payment status'
    )
    expect(completeMessageMock).toHaveBeenCalled()
    expect(deleteBlobMock).toHaveBeenCalled()
  })

  test('handles non-paid status by incrementing paid check count', async () => {
    getBlobMock.mockResolvedValue({
      data: [
        { agreementNumber: 'RESH-F99F-E09F', status: { name: 'not_paid' } }
      ]
    })

    await requestPaymentStatus(loggerMock, dbMock)

    expect(incrementPaymentCheckCount).toHaveBeenCalledWith(
      dbMock,
      'RESH-F99F-E09F'
    )
    expect(deleteBlobMock).toHaveBeenCalled()
    expect(completeMessageMock).toHaveBeenCalled()
  })

  test('logs status history when the daily retry limit has been reached', async () => {
    getBlobMock.mockResolvedValue({
      data: [
        {
          agreementNumber: 'RESH-F99F-E09F',
          status: { name: 'not_paid' },
          events: [
            {
              status: { name: 'Routed to Request Editor for debt data' },
              timestamp: '27/03/2025 12:03'
            },
            {
              status: { name: 'Debt data attached' },
              timestamp: '28/03/2025 12:03'
            }
          ]
        }
      ]
    })
    incrementPaymentCheckCount.mockResolvedValue({
      id: '32742adb-f37d-4bc8-8927-7f7d7cfc685e',
      applicationReference: 'RESH-F99F-E09F',
      data: {
        sbi: '234234',
        value: 436,
        invoiceLines: [
          {
            value: 436,
            description: 'G00 - Gross value of claim',
            standardCode: 'AHWR-Sheep'
          }
        ],
        sourceSystem: 'AHWR',
        marketingYear: 2025,
        agreementNumber: 'ABC-1234',
        paymentRequestNumber: 1
      },
      createdAt: '2025-06-25T08:24:56.309Z',
      updatedAt: '2025-07-11T15:49:20.297Z',
      status: 'ack',
      paymentResponse: [{}],
      paymentCheckCount: '3',
      frn: '12345'
    })

    await requestPaymentStatus(loggerMock, dbMock)

    expect(incrementPaymentCheckCount).toHaveBeenCalledWith(
      dbMock,
      'RESH-F99F-E09F'
    )
    expect(deleteBlobMock).toHaveBeenCalled()
    expect(completeMessageMock).toHaveBeenCalled()
    expect(trackError).toHaveBeenCalledWith(
      loggerMock,
      new Error('Payment has not been paid'),
      'failed-process',
      'Payment has not been paid',
      {
        claimReference: 'RESH-F99F-E09F',
        statuses: [
          {
            status: 'Routed to Request Editor for debt data',
            date: '27/03/2025 12:03'
          },
          { status: 'Debt data attached', date: '28/03/2025 12:03' }
        ],
        sbi: '234234',
        type: 'INITIAL',
        paymentCheckCount: 3
      }
    )
  })

  test('logs error when updating status to paid for claim fails', async () => {
    updatePaymentStatusByClaimRef.mockResolvedValue(undefined)

    await requestPaymentStatus(loggerMock, dbMock)

    expect(deleteBlobMock).toHaveBeenCalled()
    expect(completeMessageMock).toHaveBeenCalled()
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Payment not found to update paid status'
    )
  })

  test('logs error when receiver fails to complete message', async () => {
    completeMessageMock.mockRejectedValue(new Error('Unexpected error'))

    await requestPaymentStatus(loggerMock, dbMock)

    expect(completeMessageMock).toHaveBeenCalled()
    expect(loggerMock.error).toHaveBeenCalledWith(
      {
        err: new Error('Unexpected error'),
        responseMessage: { body: { uri: 'blob://test-uri' } }
      },
      'Error completing response message'
    )
  })

  test('logs error when receiver fails to close connection', async () => {
    closeConnectionMock.mockRejectedValue(new Error('Unexpected error'))

    await requestPaymentStatus(loggerMock, dbMock)

    expect(closeConnectionMock).toHaveBeenCalled()
    expect(loggerMock.error).toHaveBeenCalledWith(
      { err: new Error('Unexpected error') },
      'Error closing receiver connection'
    )
  })

  test('logs error when failing to delete blob', async () => {
    deleteBlobMock.mockRejectedValue(new Error('Unexpected error'))

    await requestPaymentStatus(loggerMock, dbMock)

    expect(deleteBlobMock).toHaveBeenCalled()
    expect(loggerMock.error).toHaveBeenCalledWith(
      { err: new Error('Unexpected error'), blobUri: 'blob://test-uri' },
      'Error deleting blob'
    )
  })
})
