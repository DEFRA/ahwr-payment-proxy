export const endemicsPaymentTypes = {
  review: 'review',
  followUp: 'followUp'
}

export const paymentRequest = {
  sourceSystem: 'AHWR',
  description: 'G00 - Gross value of claim',
  paymentRequestNumber: 1
}

export const Status = {
  ACK: 'ack',
  PAID: 'paid',
  REQUESTED: 'requested'
}

export const PaymentHubStatus = {
  SETTLED: 'Settled'
}

export const DAILY_RETRY_LIMIT = 3
export const DAILY_RETRY_FROM_DAYS = 1

export const FINAL_RETRY_DAYS = 10

export const PAYMENTS_COLLECTION = 'paymentrequests'

export const PIGS_AND_PAYMENTS_RELEASE_DATE = new Date('2026-01-22T00:00:00')
