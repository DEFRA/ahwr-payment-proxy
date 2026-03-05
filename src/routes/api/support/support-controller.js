import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import { get } from '../../../repositories/payment-repository.js'
import { processFrnRequest } from '../../../jobs/request-payment-status.js'
import { trackEvent } from '../../../common/helpers/logging/logger.js'
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs'
import { config } from '../../../config.js'

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
    request.logger.error({ error }, 'Failed to request payment status')

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}

export const supportQueueMessagesHandler = async (request, h) => {
  try {
    const { queueUrl, limit } = request.query

    const client = new SQSClient({
      region: config.get('aws.region'),
      endpoint: config.get('aws.endpointUrl')
    })

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: limit,
      VisibilityTimeout: 2,
      WaitTimeSeconds: 0,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All']
    })
    const res = await client.send(command)

    request.logger.info(`Retrieved ${res.Messages?.length || 0} messages`)

    const result = (res.Messages || []).map((msg) => ({
      id: msg.MessageId,
      body: msg.Body,
      attributes: msg.Attributes,
      messageAttributes: msg.MessageAttributes
    }))

    return h.response(result).code(StatusCodes.OK)
  } catch (err) {
    request.logger.error({ err }, 'Failed to get queue messages')

    if (Boom.isBoom(err)) {
      throw err
    }

    throw Boom.internal(err)
  }
}
