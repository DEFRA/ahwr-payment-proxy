import joi from 'joi'
import { get } from '../../repositories/payment-repository.js'
import { StatusCodes } from 'http-status-codes'

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
          return h.response(payment).code(StatusCodes.OK)
        }

        return h.response('Not Found').code(StatusCodes.NOT_FOUND).takeover()
      }
    }
  }
]
