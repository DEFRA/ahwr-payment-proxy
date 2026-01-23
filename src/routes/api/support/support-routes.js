import joi from 'joi'
import { requestPaymentStatusHandler } from './support-controller.js'

export const supportRoutes = [
  {
    method: 'GET',
    path: '/api/support/payments/{reference}/request-status',
    options: {
      description: 'Request payment status',
      validate: {
        params: joi.object({
          reference: joi.string().required()
        })
      },
      handler: requestPaymentStatusHandler
    }
  }
]
