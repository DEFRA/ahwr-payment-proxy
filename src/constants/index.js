export const claimTypes = {
  review: 'R',
  endemics: 'E'
}

export const endemicsPaymentTypes = {
  review: 'review',
  followUp: 'followUp'
}

export const paymentRequest = {
  sourceSystem: 'AHWR',
  description: 'G00 - Gross value of claim',
  paymentRequestNumber: 1
}

export const species = {
  beef: 'beef',
  dairy: 'dairy',
  pigs: 'pigs',
  sheep: 'sheep'
}

export const speciesAmounts = {
  beef: {
    value: 522,
    code: 'AHWR-Beef'
  },
  dairy: {
    value: 372,
    code: 'AHWR-Dairy'
  },
  pigs: {
    value: 684,
    code: 'AHWR-Pigs'
  },
  sheep: {
    value: 436,
    code: 'AHWR-Sheep'
  }
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

export const PAYMENTS_COLLECTION = 'payments'
