import { createServer } from './server'
import {
  startAgendaScheduling,
  stopAgendaScheduling
} from './jobs/cron-scheduler'
import {
  startMessagingService,
  stopMessagingService
} from './messaging/fcp-messaging-service'
import {
  configureAndStart,
  stopSubscriber
} from './messaging/payment-request-queue-subscriber'

jest.mock('./common/helpers/proxy/setup-proxy.js')
jest.mock('./common/helpers/mongodb.js')
jest.mock('./messaging/payment-request-queue-subscriber.js')
jest.mock('./messaging/fcp-messaging-service.js')
jest.mock('./jobs/cron-scheduler.js')

describe('Server test', () => {
  it('createServer returns server', async () => {
    const server = await createServer()
    expect(server).toBeDefined()
  })

  it('should call start functions when the server starts', async () => {
    const server = await createServer()

    await server.start()

    expect(startAgendaScheduling).toHaveBeenCalledWith(server.db)
    expect(startMessagingService).toHaveBeenCalledWith(server.logger, server.db)
    expect(configureAndStart).toHaveBeenCalledWith(server.db)

    await server.stop()
  })

  it('should call stop functions when the server stop', async () => {
    const server = await createServer()

    await server.stop()

    expect(stopSubscriber).toHaveBeenCalledWith()
    expect(stopMessagingService).toHaveBeenCalledWith()
    expect(stopAgendaScheduling).toHaveBeenCalledWith()
  })
})
