import {
  startAgendaScheduling,
  stopAgendaScheduling
} from './cron-scheduler.js'
import { config } from '../config.js'
import { metricsCounter } from '../common/helpers/metrics.js'

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

    it('should correctly build the Mongo URI when /admin is present', async () => {
        config.get.mockImplementation((key) => {
          const values = {
            'mongo.mongoUrl': 'mongodb://user:pass@localhost:27017/admin',
            'mongo.databaseName': 'testdb',
            'scheduledJobs.requestPaymentStatus.enabled': true
          }
          return values[key]
        })
      
        await startAgendaScheduling(mockDbClient)
        
        const { MongoBackend } = require('@agendajs/mongo-backend')
        expect(MongoBackend).toHaveBeenCalledWith(expect.objectContaining({
          address: 'mongodb://user:pass@localhost:27017/testdb'
        }))
      })

      it('should log on job start', async () => {
        await startAgendaScheduling(mockDbClient)
        
        // Find the 'start' listener and trigger it
        const startListener = mockOn.mock.calls.find(call => call[0] === 'start')[1]
        const mockJob = { attrs: { name: 'request payment status' } }
        
        startListener(mockJob)
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Job <request payment status> starting'))
      })
    
      it('should log and emit metrics on job failure', async () => {
        await startAgendaScheduling(mockDbClient)
        
        const failListener = mockOn.mock.calls.find(call => call[0] === 'fail')[1]
        const mockJob = { attrs: { name: 'request payment status' } }
        const mockError = new Error('Boom')
        
        await failListener(mockError, mockJob)
        
        expect(mockLogger.error).toHaveBeenCalledWith(mockError, expect.stringContaining('Job <request payment status> failed'))
        expect(metricsCounter).toHaveBeenCalledWith('scheduledjobs_request-payment-status_failed')
      })

       
      it('should log and emit metrics on job success', async () => {
        await startAgendaScheduling(mockDbClient)
        
        const successListener = mockOn.mock.calls.find(call => call[0] === 'success')[1]
        const mockJob = { attrs: { name: 'request payment status' } }
        
        successListener(mockJob)
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Job <request payment status> succeeded'))
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
