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
      logger.warn({ claimReference }, 'Payment not found for support lookup')
      return h
        .response('Payment not found')
        .code(StatusCodes.NOT_FOUND)
        .takeover()
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

export const supportQueueMessagesHandler = async (request, h) => {
  const { queueUrl, limit } = request.query

  try {
    const region = config.get('aws.region')
    const endpointUrl = config.get('aws.endpointUrl')

    sqsClient.setupClient(region, endpointUrl, request.logger)

    const messages = await sqsClient.peekMessages(queueUrl, limit)

    return h.response(messages).code(StatusCodes.OK)
  } catch (error) {
    if (error instanceof QueueDoesNotExist) {
      request.logger.warn({ queueUrl }, 'Queue not found for support lookup')
      return h
        .response(`Queue not found: ${queueUrl}`)
        .code(StatusCodes.NOT_FOUND)
        .takeover()
    }

    request.logger.error({ error }, 'Failed to get queue messages')

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}

export const supportApplyQueueActionsHandler = async (request, h) => {
  const { queueUrl, actions } = request.payload

  try {
    const region = config.get('aws.region')
    const endpointUrl = config.get('aws.endpointUrl')

    sqsClient.setupClient(region, endpointUrl, request.logger)

    if (!(await sqsClient.isDeadLetterQueue(queueUrl))) {
      request.logger.warn(
        { queueUrl },
        'Queue actions requested on a non-dead-letter queue'
      )
      return h
        .response(`Not a dead-letter queue: ${queueUrl}`)
        .code(StatusCodes.BAD_REQUEST)
        .takeover()
    }

    const actionsById = Object.fromEntries(
      actions.map(({ id, action }) => [id, action])
    )
    const result = await sqsClient.applyDlqActions(queueUrl, actionsById)

    return h.response(result).code(StatusCodes.OK)
  } catch (error) {
    if (error instanceof QueueDoesNotExist) {
      request.logger.warn({ queueUrl }, 'Queue not found for support action')
      return h
        .response(`Queue not found: ${queueUrl}`)
        .code(StatusCodes.NOT_FOUND)
        .takeover()
    }

    request.logger.error({ error }, 'Failed to apply queue message actions')

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}
