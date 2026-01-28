import { Server } from '@hapi/hapi'
import { supportRoutes } from './support-routes.js'
import { requestPaymentStatusHandler } from './support-controller.js'

jest.mock('./support-controller.js')

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

  describe('GET /api/support/payments/request-status', () => {
    it('should validate request and call correct handler', async () => {
      requestPaymentStatusHandler.mockImplementation(async (_, h) => {
        return h.response().code(200)
      })

      const res = await server.inject({
        method: 'GET',
        url: '/api/support/payments/RESH-F99F-E09F/request-status'
      })

      expect(res.statusCode).toBe(200)
      expect(requestPaymentStatusHandler).toHaveBeenCalledTimes(1)
    })
  })
})
