import Joi from 'joi'
import {
  requestPaymentStatusHandler,
  supportQueueMessagesHandler,
  supportApplyQueueActionsHandler,
  supportIsDeadLetterQueueHandler
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
          limit: Joi.number().integer().required()
        })
      },
      handler: supportQueueMessagesHandler
    }
  },
  {
    method: 'POST',
    path: '/api/support/queue-messages/actions',
    options: {
      description: 'Delete or reapply dead-letter queue messages',
      validate: {
        payload: Joi.object({
          queueUrl: Joi.string().required(),
          actions: Joi.array()
            .items(
              Joi.object({
                id: Joi.string().required(),
                action: Joi.string().valid('delete', 'reapply').required()
              })
            )
            .min(1)
            .required()
        })
      },
      handler: supportApplyQueueActionsHandler
    }
  },
  {
    method: 'GET',
    path: '/api/support/queue-messages/is-dlq',
    options: {
      description: 'Check whether a queue is a dead-letter queue',
      validate: {
        query: Joi.object({
          queueUrl: Joi.string().required()
        })
      },
      handler: supportIsDeadLetterQueueHandler
    }
  }
]
