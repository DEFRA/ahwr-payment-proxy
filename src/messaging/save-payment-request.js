import { paymentRequest } from '../constants/index.js'
import { get, set } from '../repositories/payment-repository.js'
import { validateApplicationPaymentRequest } from './application-payment-request-schema.js'
import { validatePaymentRequest } from './payment-request-schema.js'
import { getPaymentData } from '../lib/getPaymentData.js'

const buildPaymentRequest = async (applicationPaymentRequest) => {
  const {
    isEndemics,
    reviewTestResults,
    claimType,
    optionalPiHuntValue,
    reference: agreementNumber,
    sbi,
    whichReview: species
  } = applicationPaymentRequest
  const { description, paymentRequestNumber, sourceSystem } = paymentRequest
  const marketingYear = new Date().getFullYear()

  const { standardCode, value } = getPaymentData(
    species,
    reviewTestResults,
    isEndemics,
    claimType,
    optionalPiHuntValue
  )

  return {
    sourceSystem,
    sbi,
    marketingYear,
    paymentRequestNumber,
    agreementNumber,
    value,
    invoiceLines: [
      {
        description,
        standardCode,
        value
      }
    ]
  }
}

export const savePaymentRequest = async (
  db,
  logger,
  applicationPaymentRequest
) => {
  if (validateApplicationPaymentRequest(logger, applicationPaymentRequest)) {
    const { reference, frn } = applicationPaymentRequest

    const payment = await get(db, reference)

    if (!payment) {
      const paymentRequest = await buildPaymentRequest(
        applicationPaymentRequest
      )
      if (validatePaymentRequest(logger, paymentRequest)) {
        await set(db, reference, paymentRequest, frn)

        return paymentRequest
      } else {
        throw new Error(
          `Payment request schema not valid for reference ${reference}`
        )
      }
    } else {
      throw new Error(
        `Payment request already exists for reference ${reference}`
      )
    }
  } else {
    throw new Error('Application payment request schema not valid')
  }
}
