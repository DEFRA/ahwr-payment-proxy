import joi from 'joi'

const CRN_MIN_VALUE = 1050000000
const CRN_MAX_VALUE = 9999999999
const SBI_MIN_VALUE = 105000000
const SBI_MAX_VALUE = 999999999
const EMAIL_MAX_LENGTH = 320

const crn = joi.number().min(CRN_MIN_VALUE).max(CRN_MAX_VALUE)
const sbi = joi.number().min(SBI_MIN_VALUE).max(SBI_MAX_VALUE).required()
const email = joi
  .string()
  .pattern(/^[\w-\\.]+@([\w-]+\.)+[\w-]{2,4}$/)
  .min(1)
  .max(EMAIL_MAX_LENGTH)

const inboundMessageSchema = joi.object({
  crn,
  sbi,
  agreementReference: joi.string().required(),
  claimReference: joi.string().max(14), // NOSONAR
  notifyTemplateId: joi.string().guid({ version: 'uuidv4' }).required(),
  emailReplyToId: joi.string().guid({ version: 'uuidv4' }).optional(),
  emailAddress: email,
  customParams: joi.object().required(),
  dateTime: joi.date().required()
})

export const validateInboundMessageRequest = (logger, event) => {
  const { error } = inboundMessageSchema.validate(event, { abortEarly: false })
  if (error) {
    logger.error(
      `Message request validation error ${JSON.stringify(error.details)}`
    )
    return false
  }
  return true
}

export const outboundMessageSchema = joi.object({
  id: joi.string().guid({ version: 'uuidv4' }).required(),
  source: joi.string().min(1).max(100).required(),
  specversion: joi.string().min(3).max(10).required(), // NOSONAR
  type: joi.string().min(3).max(250).required(), // NOSONAR
  datacontenttype: joi.string(),
  time: joi.date(),
  data: joi
    .object({
      crn,
      sbi,
      sourceSystem: joi
        .string()
        .min(3) // NOSONAR
        .max(100)
        .pattern(/^[a-z0-9-_]+$/)
        .required(),
      notifyTemplateId: joi.string().guid({ version: 'uuidv4' }).required(),
      commsType: joi.string().valid('email').required(),
      commsAddresses: email.required(), // Note: array has maxItems: 10
      personalisation: joi.object().required(),
      reference: joi.string().min(1).max(100).required(),
      oneClickUnsubscribeUrl: joi.string().min(1),
      emailReplyToId: joi.string().guid({ version: 'uuidv4' }).required()
    })
    .required()
})
