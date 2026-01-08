import joi from 'joi'
import { trackError } from '../common/helpers/logging/logger.js'

const applicationPaymentRequestSchema = joi.object({
  reference: joi.string().required(),
  sbi: joi.string().required(),
  isEndemics: joi.boolean().default(false),
  reviewTestResults: joi.string().allow(null).optional(),
  whichReview: joi.string().required(),
  frn: joi.string().optional(),
  claimType: joi.string().default(''),
  dateOfVisit: joi.string().default(''),
  optionalPiHuntValue: joi.string().allow(null).optional()
})

export const validateApplicationPaymentRequest = (
  logger,
  applicationPaymentRequest
) => {
  const validate = applicationPaymentRequestSchema.validate(
    applicationPaymentRequest
  )

  if (validate.error) {
    trackError(
      logger,
      validate.error,
      'failed-validation',
      'Application payment request validation error'
    )
    return false
  }

  return true
}
