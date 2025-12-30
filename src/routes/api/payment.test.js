import { get } from '../../repositories/payment-repository.js'
import { paymentApiRoutes } from './payment.js'
import Hapi from '@hapi/hapi'
import { requestPaymentStatus } from '../../jobs/request-payment-status.js'

const reference = 'IAHW-G3CL-V59P'

jest.mock('../../repositories/payment-repository')
jest.mock('../../messaging/fcp-messaging-service')
jest.mock('../../jobs/request-payment-status')

const mockLogger = {
  info: jest.fn(() => {}),
  warn: jest.fn(() => {}),
  error: jest.fn(() => {}),
  debug: jest.fn(() => {}),
  setBindings: jest.fn(() => {}),
  child: jest.fn(() => ({ info: jest.fn() }))
}
const mockDb = jest.fn()

const createServer = async () => {
  const server = Hapi.server({
    port: 0,
    host: 'localhost'
  })
  server.route(paymentApiRoutes)

  await server.initialize()
  server.decorate('request', 'logger', mockLogger)
  server.decorate('request', 'db', mockDb)

  return server
}

describe('payment', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
  })

  beforeEach(async () => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('GET /api/payments/{reference}', () => {
    const url = `/api/payments/${reference}`

    test('returns 200 when a record exists for reference', async () => {
      get.mockResolvedValueOnce({
        reference,
        createdBy: 'admin',
        createdAt: new Date(),
        data: {}
      })
      const options = {
        method: 'GET',
        url
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      expect(get).toHaveBeenCalledTimes(1)
    })

    test('returns 404 when no record exists for reference', async () => {
      get.mockResolvedValueOnce(undefined)
      const options = {
        method: 'GET',
        url
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(404)
      expect(get).toHaveBeenCalledTimes(1)
    })
  })

  describe('GET /admin/trigger-payment-status', () => {
    test('triggers payment status job', async () => {
      const options = {
        method: 'GET',
        url: '/admin/trigger-payment-status'
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      expect(requestPaymentStatus).toHaveBeenCalledTimes(1)
    })
  })
})
