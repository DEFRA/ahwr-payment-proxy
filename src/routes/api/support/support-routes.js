import joi from 'joi'
import { requestPaymentStatusHandler } from './support-controller.js'

export const supportRoutes = [
  {
    method: 'GET',
    path: '/api/support/payments/request-status',
    options: {
      description: 'Request payment status',
      validate: {
        query: joi.object({
          claimReference: joi.string().required()
        })
      },
      handler: requestPaymentStatusHandler
    }
  }
]
