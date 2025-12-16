import { createServer } from './server'

jest.mock('./common/helpers/proxy/setup-proxy.js')
jest.mock('./common/helpers/mongodb.js')
jest.mock('./messaging/payment-request-queue-subscriber.js')
jest.mock('./messaging/fcp-messaging-service.js')
jest.mock('./jobs/request-payment-status-scheduler.js')

describe('Server test', () => {
  test('createServer returns server', async () => {
    const server = await createServer()
    expect(server).toBeDefined()
  })
})
