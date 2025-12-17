import requestPaymentStatusScheduler from './request-payment-status-scheduler.js'
import { config } from '../config.js'
import { requestPaymentStatus } from './request-payment-status.js'
import cron from 'node-cron'

jest.mock('../config.js')
jest.mock('./request-payment-status.js', () => ({
  requestPaymentStatus: jest.fn()
}))
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}))

describe('requestPaymentStatusScheduler', () => {
  let logger, server

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      child: jest.fn().mockReturnThis()
    }

    server = { logger }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should register cron job when enabled', async () => {
    config.get.mockReturnValueOnce({
      schedule: '* * * * *',
      enabled: true
    })

    await requestPaymentStatusScheduler.plugin.register(server)

    expect(logger.info).toHaveBeenCalledWith(
      { schedule: '* * * * *' },
      'Registering payment status scheduler'
    )
    expect(cron.schedule).toHaveBeenCalled()
  })

  test('should not register cron job when not enabled', async () => {
    config.get.mockReturnValueOnce({
      schedule: '* * * * *',
      enabled: false
    })

    await requestPaymentStatusScheduler.plugin.register(server)

    expect(logger.info).toHaveBeenCalledWith(
      'Payment status scheduler is disabled. Skipping cron job registration.'
    )
    expect(cron.schedule).not.toHaveBeenCalled()
  })

  test('should execute task and log success', async () => {
    config.get.mockReturnValueOnce({
      schedule: '* * * * *',
      enabled: true
    })
    const cronCallback = jest.fn()
    cron.schedule.mockImplementation((_, cb) => {
      cronCallback.mockImplementation(cb)
      return cb
    })
    await requestPaymentStatusScheduler.plugin.register(server)
    requestPaymentStatus.mockResolvedValue()

    await cronCallback()

    expect(requestPaymentStatus).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(
      { schedule: '* * * * *' },
      'Registering payment status scheduler'
    )
    expect(logger.info).toHaveBeenCalledWith('Starting payment status requests')
    expect(logger.info).toHaveBeenCalledWith(
      'Successfully completed payment status requests'
    )
  })

  test('should handle error and track exception', async () => {
    config.get.mockReturnValueOnce({
      schedule: '* * * * *',
      enabled: true
    })
    const cronCallback = jest.fn()
    cron.schedule.mockImplementation((_, cb) => {
      cronCallback.mockImplementation(cb)
      return cb
    })
    const error = new Error('Failure')
    requestPaymentStatus.mockRejectedValue(error)

    await requestPaymentStatusScheduler.plugin.register(server)
    await cronCallback()

    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Failure',
        stack: error.stack
      },
      'Failed to request payment statuses'
    )
  })
})
