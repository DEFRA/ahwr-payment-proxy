import * as startServer from './start-server.js'
import { config } from '../../config.js'

const mockServerStart = jest.fn()
const mockLoggerInfo = jest.fn()

jest.mock('../../server.js', () => {
  return {
    ...jest.requireActual('../../server.js'),
    createServer: jest.fn(() => ({
      start: mockServerStart,
      logger: {
        info: mockLoggerInfo
      }
    }))
  }
})

describe('#startServer', () => {
  beforeAll(async () => {
    config.set('port', 3099)
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  describe('When server starts', () => {
    test('Should start up server as expected', async () => {
      await startServer.startServer()

      expect(mockServerStart).toHaveBeenCalled()
      expect(mockLoggerInfo).toHaveBeenCalled()
    })
  })

  describe('When server start fails', () => {
    test('Should log failed startup message', async () => {
      mockServerStart.mockRejectedValue(new Error('Server failed to start'))

      await expect(startServer.startServer()).rejects.toThrow(
        'Server failed to start'
      )
    })
  })
})
