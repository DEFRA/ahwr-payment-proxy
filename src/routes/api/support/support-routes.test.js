import { Server } from '@hapi/hapi'
import { StatusCodes } from 'http-status-codes'
import { authPlugin } from '../../../plugins/auth.js'
import { supportRoutes } from './support-routes.js'
import {
  requestPaymentStatusHandler,
  supportQueueMessagesHandler
} from './support-controller.js'

jest.mock('./support-controller.js')

describe('support-routes', () => {
  let server

  beforeAll(async () => {
    server = new Server()
    await server.register([authPlugin])
    server.route(supportRoutes)
    await server.initialize()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/support/payments/request-status', () => {
    it('should validate request and call correct handler', async () => {
      requestPaymentStatusHandler.mockImplementation(async (_, h) => {
        return h.response().code(StatusCodes.OK)
      })

      const res = await server.inject({
        method: 'POST',
        url: '/api/support/payments/RESH-F99F-E09F/request-status',
        headers: { 'x-api-key': 'not-set' }
      })

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(requestPaymentStatusHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('auth plugin', () => {
    it('should return not authorised when no api key sent', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/support/payments/RESH-F99F-E09F/request-status'
      })

      expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })

    it('should return not authorised when when api key incorrect', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/support/payments/RESH-F99F-E09F/request-status',
        headers: { 'x-api-key': 'will-not-be-this' }
      })

      expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /api/support/queue-messages', () => {
    it('should validate request and call correct handler', async () => {
      supportQueueMessagesHandler.mockImplementation(async (_, h) => {
        return h.response().code(StatusCodes.OK)
      })

      const res = await server.inject({
        method: 'GET',
        url: '/api/support/queue-messages?queueUrl=localhost:4566/payment-status&limit=10',
        headers: { 'x-api-key': 'not-set' }
      })

      expect(res.statusCode).toBe(StatusCodes.OK)
      expect(supportQueueMessagesHandler).toHaveBeenCalledTimes(1)
    })
  })
})
