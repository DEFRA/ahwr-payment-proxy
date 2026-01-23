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

    const { frn } = await get(db, reference)
    await processFrnRequest(db, frn, logger, new Set([reference]))

    return h.response().code(StatusCodes.OK)
  } catch (err) {
    request.logger.error({ err }, 'Failed to request payment status')

    if (Boom.isBoom(err)) {
      throw err
    }

    throw Boom.internal(err)
  }
}
