import { Server } from '@hapi/hapi'
import { supportRoutes } from './support-routes.js'
import { requestPaymentStatusHandler } from './support-controller.js'

jest.mock('./support-controller.js')

const payment = {
  id: '32742adb-f37d-4bc8-8927-7f7d7cfc685e',
  reference: 'RESH-F99F-E09F',
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
  paymentCheckCount: '4',
  frn: '12345'
}

describe('support-routes', () => {
  let server

  beforeAll(async () => {
    server = new Server()
    server.route(supportRoutes)
    await server.initialize()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/support/payments/{reference}/request-status', () => {
    it('should validate request and call correct handler', async () => {
      const payload = {
        status: 'PAID'
      }
      requestPaymentStatusHandler.mockImplementation(async (_, h) => {
        return h.response(payment).code(200)
      })

      const res = await server.inject({
        method: 'GET',
        url: '/api/support/payments/RESH-F99F-E09F/request-status',
        payload
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual(payment)
      expect(requestPaymentStatusHandler).toHaveBeenCalledTimes(1)
    })
  })
})
