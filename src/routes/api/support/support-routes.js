import Joi from 'joi'
import { requestPaymentStatusHandler } from './support-controller.js'

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
  }
]
