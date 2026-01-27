import { requestPaymentStatusHandler } from './support-controller.js'
import { get } from '../../../repositories/payment-repository.js'
import Boom from '@hapi/boom'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'
import { trackEvent } from '../../../common/helpers/logging/logger.js'

jest.mock('../../../repositories/payment-repository.js')
jest.mock('../../../jobs/request-payment-status.js')
jest.mock('../../../common/helpers/logging/logger.js')

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
    payload: { claimReference: 'REBC-J9AR-KILQ' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should request payment status for claimReference', async () => {
    get.mockResolvedValueOnce({
      frn: '12345'
    })

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
