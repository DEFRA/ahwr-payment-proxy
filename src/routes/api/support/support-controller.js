import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import { get } from '../../../repositories/payment-repository.js'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'

export const requestPaymentStatusHandler = async (request, h) => {
  try {
    const {
      db,
      logger,
      params: { reference }
    } = request

    const payment = await get(db, reference)
    if (!payment) {
      throw Boom.notFound('Payment not found')
    }

    await processFrnRequest(db, payment.frn, logger, new Set([reference]))

    return h.response().code(StatusCodes.OK)
  } catch (error) {
    request.logger.error({ error }, 'Failed to request payment status')

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}
