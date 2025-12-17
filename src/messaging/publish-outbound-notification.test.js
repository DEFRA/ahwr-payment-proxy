import { publishMessage, setupClient } from 'ffc-ahwr-common-library'
import { config } from '../config.js'
import { publishPaymentUpdateEvent } from './publish-outbound-notification.js'

jest.mock('ffc-ahwr-common-library')
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  setBindings: jest.fn()
}

describe('publish outbound notification', () => {
  beforeAll(() => {
    config.set(
      'sns.paymentUpdateTopicArn',
      'arn:aws:sns:eu-west-2:1:ahwr_payment_update'
    )
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('publishApplicationRequestEvent', () => {
    test('sets up client and then publishes payment update event on first call', async () => {
      const startDate = new Date()
      const inputMessageBody = {
        reference: 'ABC123',
        sbi: 'sbi123',
        startDate,
        userType: 'newUser',
        email: 'farmer@farms.com',
        farmerName: 'farmer',
        orgData: {
          orgName: 'any old business',
          orgEmail: 'somebusiness@nowhere.net',
          crn: '123456789'
        }
      }
      await publishPaymentUpdateEvent(
        mockLogger,
        inputMessageBody,
        'uk.gov.ffc.ahwr.set.paid.status'
      )

      expect(setupClient).toHaveBeenCalledTimes(1)
      expect(publishMessage).toHaveBeenCalledWith(
        inputMessageBody,
        {
          eventType: 'uk.gov.ffc.ahwr.set.paid.status'
        },
        'arn:aws:sns:eu-west-2:1:ahwr_payment_update'
      )
    })

    test('skips setting up client and then publishes event on subsequent call', async () => {
      const startDate = new Date()
      const inputMessageBody = {
        reference: 'ABC123',
        sbi: 'sbi123',
        startDate,
        userType: 'newUser',
        email: 'farmer@farms.com',
        farmerName: 'farmer',
        orgData: {
          orgName: 'any old business',
          orgEmail: 'somebusiness@nowhere.net',
          crn: '123456789'
        }
      }

      await publishPaymentUpdateEvent(
        mockLogger,
        inputMessageBody,
        'uk.gov.ffc.ahwr.set.paid.status'
      )

      expect(setupClient).toHaveBeenCalledTimes(0)
      expect(publishMessage).toHaveBeenCalledWith(
        inputMessageBody,
        {
          eventType: 'uk.gov.ffc.ahwr.set.paid.status'
        },
        'arn:aws:sns:eu-west-2:1:ahwr_payment_update'
      )
    })
  })
})
