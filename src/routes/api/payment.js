import joi from 'joi'
import { get } from '../../repositories/payment-repository.js'

export const paymentApiRoutes = [
  {
    method: 'GET',
    path: '/api/payments/{reference}',
    options: {
      validate: {
        params: joi.object({
          reference: joi.string().valid()
        })
      },
      handler: async (request, h) => {
        const payment = await get(request.db, request.params.reference)

        if (payment) {
          return h.response(payment).code(200)
        }

        return h.response('Not Found').code(404).takeover()
      }
    }
  }
]
