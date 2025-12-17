import { createServiceBusClient } from 'ffc-ahwr-common-library'
import {
  sendPaymentDataRequest,
  sendPaymentRequest,
  startMessagingService,
  stopMessagingService,
  receivePaymentDataResponseMessages
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
      const request = {
        reference: 'IAHW-G3CL-V59P',
        sbi: '123456789',
        whichReview: 'beef'
      }
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

  describe('sendPaymentDataRequest', () => {
    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage,
        close: jest.fn(),
        subscribeTopic: jest.fn()
      }
      const request = { category: 'frn', value: '1234567890' }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService()
      await sendPaymentDataRequest(request)

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          body: request,
          type: 'uk.gov.ffc.ahwr.submit.payment.data.request',
          source: 'ahwr-payment-proxy',
          options: {}
        },
        'ffc-pay-data-request'
      )
    })
  })

  describe('receivePaymentDataResponseMessages', () => {
    it('creates and sends message', async () => {
      const mockClient = {
        receiveSessionMessages: jest.fn(),
        subscribeTopic: jest.fn()
      }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService()
      await receivePaymentDataResponseMessages('123456789', 1)

      expect(mockClient.receiveSessionMessages).toHaveBeenCalledWith(
        'ffc-pay-data-request-response',
        '123456789',
        1
      )
    })
  })
})
