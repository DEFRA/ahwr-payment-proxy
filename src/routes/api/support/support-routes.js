import Joi from 'joi'
import { requestPaymentStatusHandler } from './support-controller.js'

export const supportRoutes = [
  {
    method: 'POST',
    path: '/api/support/payments/request-status',
    options: {
      description: 'Request payment status',
      validate: {
        payload: Joi.object({
          claimReference: Joi.string().required()
        })
      },
      handler: requestPaymentStatusHandler
    }
  }
]
