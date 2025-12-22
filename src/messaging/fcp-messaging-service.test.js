import { createServiceBusClient } from 'ffc-ahwr-common-library'
import {
  sendPaymentDataRequest,
  sendPaymentRequest,
  startMessagingService,
  stopMessagingService,
  receivePaymentDataResponseMessages
} from './fcp-messaging-service.js'
import { config } from '../config.js'

jest.mock('ffc-ahwr-common-library')

describe('fcp-messaging-service', () => {
  describe('start and stop service', () => {
    const mockClient = {
      close: jest.fn(),
      subscribeTopic: jest.fn()
    }
    const mockLogger = {
      info: jest.fn()
    }
    const mockDb = jest.fn()

    beforeEach(() => {
      jest.resetAllMocks()
      createServiceBusClient.mockReturnValueOnce(mockClient)
    })

    it('should do nothing if the client unavailable', async () => {
      await stopMessagingService()

      expect(mockClient.close).not.toHaveBeenCalled()
    })

    it('should stop the client if available', async () => {
      await startMessagingService(mockLogger, mockDb)
      await stopMessagingService()

      expect(mockClient.close).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendPaymentRequest', () => {
    config.set('sendPaymentRequestOutbound', true)
    const mockDb = jest.fn()

    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage,
        close: jest.fn(),
        subscribeTopic: jest.fn()
      }
      const mockLogger = {
        info: jest.fn()
      }
      const request = {
        reference: 'IAHW-G3CL-V59P',
        sbi: '123456789',
        whichReview: 'beef'
      }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService(mockLogger, mockDb)
      await sendPaymentRequest(
        request,
        '498064a3-f967-4a98-9d8f-57152e7cbe64',
        mockLogger
      )

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          body: request,
          type: 'uk.gov.ffc.ahwr.submit.payment.request',
          source: 'ahwr-payment-proxy',
          sessionId: '498064a3-f967-4a98-9d8f-57152e7cbe64'
        },
        'ffc-pay-request'
      )
    })
  })

  describe('sendPaymentDataRequest', () => {
    const mockDb = jest.fn()

    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage,
        close: jest.fn(),
        subscribeTopic: jest.fn()
      }
      const mockLogger = {
        info: jest.fn()
      }
      const request = { category: 'frn', value: '1234567890' }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService(mockLogger, mockDb)
      await sendPaymentDataRequest(
        request,
        '498064a3-f967-4a98-9d8f-57152e7cbe64',
        mockLogger,
        'f1e5a2c4-8d9b-4f73-a1e6-b9d2e0c8a5f4'
      )

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          body: request,
          type: 'uk.gov.ffc.ahwr.submit.payment.data.request',
          source: 'ahwr-payment-proxy',
          sessionId: '498064a3-f967-4a98-9d8f-57152e7cbe64',
          messageId: 'f1e5a2c4-8d9b-4f73-a1e6-b9d2e0c8a5f4'
        },
        'ffc-pay-data-request'
      )
    })
  })

  describe('receivePaymentDataResponseMessages', () => {
    const mockLogger = {
      info: jest.fn()
    }
    const mockDb = jest.fn()

    it('creates and sends message', async () => {
      const mockClient = {
        receiveSessionMessages: jest.fn(),
        subscribeTopic: jest.fn()
      }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService(mockLogger, mockDb)
      await receivePaymentDataResponseMessages('123456789', 1)

      expect(mockClient.receiveSessionMessages).toHaveBeenCalledWith(
        'ffc-pay-data-request-response',
        '123456789',
        1
      )
    })
  })
})
