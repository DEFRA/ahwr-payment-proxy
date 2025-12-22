import joi from 'joi'
import { get } from '../../repositories/payment-repository.js'
import { StatusCodes } from 'http-status-codes'
import { requestPaymentStatus } from '../../jobs/request-payment-status.js'

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
  },
  //TODO delete once tested
  {
    method: 'GET',
    path: '/admin/trigger-payment-status',
    options: {
      handler: async (request, h) => {
        const taskLogger = request.logger.child({
          task: 'requestPaymentStatus'
        })
        taskLogger.info('Manually triggered payment status requests')

        try {
          await requestPaymentStatus(taskLogger, request.db)

          return h
            .response({ status: 'Payment status task triggered' })
            .code(StatusCodes.OK)
        } catch (err) {
          taskLogger.error(
            { message: err.message, stack: err.stack },
            'Task failed'
          )
          return h
            .response({ status: 'Error triggering task' })
            .code(StatusCodes.INTERNAL_SERVER_ERROR)
        }
      }
    }
  }
]
