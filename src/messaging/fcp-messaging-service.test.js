import { createServiceBusClient } from 'ffc-ahwr-common-library'
import {
  sendPaymentDataRequest,
  sendPaymentRequest,
  startMessagingService,
  stopMessagingService,
  receivePaymentDataResponseMessages
} from './fcp-messaging-service.js'
import { config } from '../config.js'
import { processPaymentResponse } from './process-payment-response.js'
import { processUpdatePaymentStatus } from './process-payment-status.js'

jest.mock('ffc-ahwr-common-library')
jest.mock('./process-payment-response.js')
jest.mock('./process-payment-status.js')

describe('fcp-messaging-service', () => {
  describe('start and stop service', () => {
    const mockClient = {
      close: jest.fn(),
      subscribeTopic: jest.fn(),
      sendMessage: jest.fn()
    }
    const mockChildLogger = jest.fn()
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      child: () => mockChildLogger
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

    it('should connect to the local emulator when useLocalEmulator is true', async () => {
      config.set('serviceBus.useLocalEmulator', true)

      await startMessagingService(mockLogger, mockDb)

      expect(createServiceBusClient).toHaveBeenCalledWith(
        expect.objectContaining({ useDevelopmentEmulator: true })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to the local Azure Service Bus Emulator'
      )

      config.set('serviceBus.useLocalEmulator', false)
    })

    it('should log errors when subscribe topic throws', async () => {
      await startMessagingService(mockLogger, mockDb)

      const processError =
        mockClient.subscribeTopic.mock.calls[0][0].processError

      const mockError = new Error('Mock Service Bus failure')
      mockError.code = 'ServiceCommunicationError'
      mockError.stack = 'StackError'

      processError({ error: mockError })

      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should process payment response when subscribe topic receives message', async () => {
      await startMessagingService(mockLogger, mockDb)

      const processMessage =
        mockClient.subscribeTopic.mock.calls[0][0].processMessage
      const mockMessage = {}
      const mockReceiver = {}

      processMessage(mockMessage, mockReceiver)

      expect(processPaymentResponse).toHaveBeenCalledWith(
        mockChildLogger,
        mockDb,
        mockMessage,
        mockReceiver
      )
    })

    it('should subscribe to the payment status topic', async () => {
      await startMessagingService(mockLogger, mockDb)

      expect(mockClient.subscribeTopic).toHaveBeenCalledTimes(2)
      expect(mockClient.subscribeTopic).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          topicName: 'ffc-pay-return-response',
          subscriptionName: 'ffc-ahwr'
        })
      )
    })

    it('should process payment status when payment status topic receives message', async () => {
      await startMessagingService(mockLogger, mockDb)

      const processMessage =
        mockClient.subscribeTopic.mock.calls[1][0].processMessage
      const mockMessage = {}
      const mockReceiver = {}

      processMessage(mockMessage, mockReceiver)

      expect(processUpdatePaymentStatus).toHaveBeenCalledWith(
        mockChildLogger,
        mockDb,
        mockMessage,
        mockReceiver
      )
      expect(processPaymentResponse).not.toHaveBeenCalled()
    })

    it('should log errors when payment status subscribe topic throws', async () => {
      await startMessagingService(mockLogger, mockDb)

      const processError =
        mockClient.subscribeTopic.mock.calls[1][0].processError

      const mockError = new Error('Mock Service Bus failure')
      mockError.code = 'ServiceCommunicationError'

      processError({ error: mockError })

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: expect.stringContaining('Mock Service Bus failure')
      })
    })

    it('should not send local payment status message when not using the local emulator', async () => {
      await startMessagingService(mockLogger, mockDb)

      expect(mockClient.sendMessage).not.toHaveBeenCalled()
    })

    it('should send local payment status message when using the local emulator', async () => {
      config.set('serviceBus.useLocalEmulator', true)
      mockClient.sendMessage.mockResolvedValueOnce()

      await startMessagingService(mockLogger, mockDb)

      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        {
          body: {
            agreementNumber: 'IAHW-Q001-0001',
            type: 'uk.gov.defra.ffc.pay.settled'
          },
          type: 'uk.gov.defra.ffc.pay.settled',
          source: 'ahwr-payment-proxy'
        },
        'ffc-pay-return-response'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sent local payment status message to ffc-pay-return-response'
      )

      config.set('serviceBus.useLocalEmulator', false)
    })

    it('should log error and not throw when sending local payment status message fails', async () => {
      config.set('serviceBus.useLocalEmulator', true)
      mockClient.sendMessage.mockRejectedValueOnce(new Error('send failed'))

      await expect(
        startMessagingService(mockLogger, mockDb)
      ).resolves.toBeUndefined()

      expect(mockLogger.error).toHaveBeenCalledWith({
        message:
          'Failed to send local payment status message to ffc-pay-return-response: send failed'
      })

      config.set('serviceBus.useLocalEmulator', false)
    })
  })

  describe('sendPaymentRequest', () => {
    config.set('sendPaymentRequestOutbound', true)
    const mockDb = jest.fn()

    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage.mockResolvedValue(),
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

    it('propagates errors from sendMessage', async () => {
      const sendError = new Error('Service Bus send failed')
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage.mockRejectedValueOnce(sendError),
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

      await expect(
        sendPaymentRequest(
          request,
          '498064a3-f967-4a98-9d8f-57152e7cbe64',
          mockLogger
        )
      ).rejects.toThrow('Service Bus send failed')
      expect(mockLogger.info).not.toHaveBeenCalledWith('Payment request sent.')
    })
  })

  describe('sendPaymentDataRequest', () => {
    const mockDb = jest.fn()

    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage.mockResolvedValue(),
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

    it('propagates errors from sendMessage', async () => {
      const sendError = new Error('Service Bus send failed')
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage.mockRejectedValueOnce(sendError),
        close: jest.fn(),
        subscribeTopic: jest.fn()
      }
      const mockLogger = {
        info: jest.fn()
      }
      const request = { category: 'frn', value: '1234567890' }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService(mockLogger, mockDb)

      await expect(
        sendPaymentDataRequest(
          request,
          '498064a3-f967-4a98-9d8f-57152e7cbe64',
          mockLogger,
          'f1e5a2c4-8d9b-4f73-a1e6-b9d2e0c8a5f4'
        )
      ).rejects.toThrow('Service Bus send failed')
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
