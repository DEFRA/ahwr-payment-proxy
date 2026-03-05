import Joi from 'joi'
import {
  requestPaymentStatusHandler,
  supportQueueMessagesHandler
} from './support-controller.js'

export const supportRoutes = [
  {
    method: 'POST',
    path: '/api/support/payments/{claimReference}/request-status',
    options: {
      description: 'Request payment status',
      validate: {
        params: Joi.object({
          claimReference: Joi.string().required()
        })
      },
      handler: requestPaymentStatusHandler
    }
  },
  {
    method: 'GET',
    path: '/api/support/queue-messages',
    options: {
      description: 'Get queue messages by url',
      validate: {
        query: Joi.object({
          queueUrl: Joi.string().required(),
          limit: Joi.string().optional()
        })
      },
      handler: supportQueueMessagesHandler
    }
  }
]
