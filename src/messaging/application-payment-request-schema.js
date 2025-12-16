import joi from 'joi'

const applicationPaymentRequestSchema = joi.object({
  reference: joi.string().required(),
  sbi: joi.string().required(),
  isEndemics: joi.boolean().default(false),
  reviewTestResults: joi.string().allow(null).optional(),
  whichReview: joi.string().required(),
  frn: joi.string().optional(),
  claimType: joi.string().default(''),
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
    // TODO replace
    // appInsights.defaultClient.trackException({ exception: validate.error })
    logger.error(
      `Application payment request validation error: ${validate.error}`
    )
    return false
  }

  return true
}
