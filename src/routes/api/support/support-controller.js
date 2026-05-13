import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import { get } from '../../../repositories/payment-repository.js'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'
import { trackEvent } from '../../../common/helpers/logging/logger.js'
import { config } from '../../../config.js'
import { sqsClient } from 'ffc-ahwr-common-library'
import { QueueDoesNotExist } from '@aws-sdk/client-sqs'

export const requestPaymentStatusHandler = async (request, h) => {
  try {
    const {
      db,
      logger,
      params: { claimReference }
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
    const isExpectedNotFound =
      Boom.isBoom(error) && error.output.statusCode === StatusCodes.NOT_FOUND

    if (isExpectedNotFound) {
      request.logger.warn({ error }, 'Failed to request payment status')
    } else {
      request.logger.error({ error }, 'Failed to request payment status')
    }

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}

export const supportQueueMessagesHandler = async (request, h) => {
  const { queueUrl, limit } = request.query

  try {
    const region = config.get('aws.region')
    const endpointUrl = config.get('aws.endpointUrl')

    sqsClient.setupClient(region, endpointUrl, request.logger)

    const messages = await sqsClient.peekMessages(queueUrl, limit)

    return h.response(messages).code(StatusCodes.OK)
  } catch (error) {
    const normalised =
      error instanceof QueueDoesNotExist
        ? Boom.notFound(`Queue not found: ${queueUrl}`)
        : error

    const isExpectedNotFound =
      Boom.isBoom(normalised) &&
      normalised.output.statusCode === StatusCodes.NOT_FOUND

    if (isExpectedNotFound) {
      request.logger.warn({ error: normalised }, 'Failed to get queue messages')
    } else {
      request.logger.error(
        { error: normalised },
        'Failed to get queue messages'
      )
    }

    if (Boom.isBoom(normalised)) {
      throw normalised
    }

    throw Boom.internal(normalised)
  }
}
