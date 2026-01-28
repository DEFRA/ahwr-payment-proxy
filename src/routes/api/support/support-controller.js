import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import { get } from '../../../repositories/payment-repository.js'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'
import { trackEvent } from '../../../common/helpers/logging/logger.js'

export const requestPaymentStatusHandler = async (request, h) => {
  try {
    const {
      db,
      logger,
      payload: { claimReference }
    } = request

    const payment = await get(db, claimReference)
    if (!payment) {
      throw Boom.notFound('Payment not found')
    }

    trackEvent(logger, 'manual-request', 'payment-status', {
      reference: claimReference
    })

    const statusByClaimReference = await processFrnRequest(
      db,
      payment.frn,
      logger,
      new Set([claimReference])
    )
    const response = {
      status: statusByClaimReference?.get(claimReference)
    }

    return h.response(response).code(StatusCodes.OK)
  } catch (error) {
    request.logger.error({ error }, 'Failed to request payment status')

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}
