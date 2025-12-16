import { createServiceBusClient } from 'ffc-ahwr-common-library'
import {
  sendPaymentRequest,
  startMessagingService,
  stopMessagingService
} from './fcp-messaging-service.js'

jest.mock('ffc-ahwr-common-library')

describe('fcp-messaging-service', () => {
  describe('start and stop service', () => {
    const mockClient = {
      close: jest.fn(),
      subscribeTopic: jest.fn()
    }
    beforeEach(() => {
      jest.resetAllMocks()
      createServiceBusClient.mockReturnValueOnce(mockClient)
    })

    it('should do nothing if the client unavailable', async () => {
      await stopMessagingService()

      expect(mockClient.close).not.toHaveBeenCalled()
    })

    it('should stop the client if available', async () => {
      await startMessagingService()
      await stopMessagingService()

      expect(mockClient.close).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendPaymentRequest', () => {
    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage,
        close: jest.fn(),
        subscribeTopic: jest.fn()
      }
      const request = { id: '123', content: 'Test message' }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService()
      await sendPaymentRequest(request)

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          body: request,
          type: 'uk.gov.ffc.ahwr.submit.payment.request',
          source: 'ahwr-payment-proxy',
          options: {}
        },
        'ffc-pay-request'
      )
    })
  })
})
