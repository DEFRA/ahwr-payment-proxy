import {
  startAgendaScheduling,
  stopAgendaScheduling
} from './cron-scheduler.js'
import { config } from '../config.js'

const mockOn = jest.fn()
const mockDefine = jest.fn()
const mockStart = jest.fn()
const mockEvery = jest.fn()
const mockStop = jest.fn()

jest.mock('agenda', () => {
  return {
    Agenda: jest.fn().mockImplementation((_opts, cb) => {
      cb && cb(null)
      return {
        on: mockOn,
        define: mockDefine,
        start: mockStart,
        every: mockEvery,
        stop: mockStop
      }
    })
  }
})

jest.mock('@agendajs/mongo-backend', () => {
  return {
    MongoBackend: jest.fn().mockImplementation(() => ({}))
  }
})

jest.mock('../config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
}
jest.mock('../common/helpers/logging/logger.js', () => ({
  getLogger: () => mockLogger
}))

jest.mock('../common/helpers/metrics.js')
jest.mock('./request-payment-status.js', () => ({
  requestPaymentStatus: jest.fn()
}))

describe('cron-scheduler', () => {
  const mockDbClient = jest.fn()

  describe('startAgendaScheduling', () => {
    beforeEach(() => {
      jest.clearAllMocks()

      config.get.mockImplementation((key) => {
        const values = {
          'mongo.mongoUrl': 'mongodb://localhost:27017/',
          'mongo.databaseName': 'testdb',
          'scheduledJobs.requestPaymentStatus.enabled': true,
          'scheduledJobs.requestPaymentStatus.schedule': '*/5 * * * *'
        }
        return values[key]
      })
    })

    it('should start agenda and schedule enabled jobs', async () => {
      await startAgendaScheduling(mockDbClient)

      expect(mockStart).toHaveBeenCalled()
      expect(mockDefine).toHaveBeenCalledWith(
        'request payment status',
        expect.any(Function),
        {
          lockLifetime: 120000,
          priority: 'high',
          attempts: 4,
          backoff: { type: 'exponential', delay: 30000 },
          shouldSaveResult: false
        }
      )
      expect(mockEvery).toHaveBeenCalledWith(
        '*/5 * * * *',
        'request payment status'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Agenda started and 1 job(s) scheduled')
      )
    })

    it('should not schedule job if disabled', async () => {
      config.get.mockImplementation((key) => {
        const values = {
          'mongo.mongoUrl': 'mongodb://localhost:27017/',
          'mongo.databaseName': 'testdb',
          'scheduledJobs.requestPaymentStatus.enabled': false,
          'scheduledJobs.requestPaymentStatus.schedule': '*/5 * * * *'
        }
        return values[key]
      })

      await startAgendaScheduling(mockDbClient)

      expect(mockDefine).not.toHaveBeenCalled()
      expect(mockEvery).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Agenda started and 0 job(s) scheduled'
      )
    })
  })

  describe('stopAgendaScheduling', () => {
    it('should stop agenda', async () => {
      await startAgendaScheduling(mockDbClient)

      await stopAgendaScheduling()

      expect(mockStop).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith('Agenda stopped')
    })
  })
})
