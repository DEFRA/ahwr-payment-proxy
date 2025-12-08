// import { DAILY_RETRY_FROM_DAYS, DAILY_RETRY_LIMIT, FINAL_RETRY_DAYS, Status } from '../constants/index.js'
// import { subDays } from 'date-fns'
import { PAYMENTS_COLLECTION } from '../constants/index.js'

export async function get(db, reference) {
  return db
    .collection(PAYMENTS_COLLECTION)
    .findOne({ applicationReference: reference }, { projection: { _id: 0 } })
  // return models.payment.findOne(
  //   {
  //     where: { applicationReference: reference }
  //   })
}

export async function set(reference, data, frn) {
  return {}
  // return models.payment.create({ applicationReference: reference, data, frn })
}

export async function updatePaymentResponse(
  reference,
  status,
  paymentResponse
) {
  return {}
  // return models.payment.update(
  //   { status, paymentResponse, frn: paymentResponse.frn },
  //   { where: { applicationReference: reference } }
  // )
}

export async function getPendingPayments() {
  return []
  // return models.payment.findAll({
  //   where: {
  //     [Op.or]: [
  //       {
  //         status: Status.ACK,
  //         paymentCheckCount: {
  //           [Op.lt]: DAILY_RETRY_LIMIT
  //         },
  //         frn: {
  //           [Op.ne]: null
  //         },
  //         createdAt: {
  //           [Op.lte]: subDays(new Date(), DAILY_RETRY_FROM_DAYS)
  //         }
  //       },
  //       {
  //         status: Status.ACK,
  //         paymentCheckCount: DAILY_RETRY_LIMIT,
  //         updatedAt: {
  //           [Op.lte]: subDays(new Date(), FINAL_RETRY_DAYS)
  //         }
  //       }
  //     ]
  //   }
  // })
}

export async function incrementPaymentCheckCount(claimReference) {
  return {}
  // const [[affectedRows]] = await models.payment.increment(
  //   { paymentCheckCount: 1 },
  //   {
  //     where: { applicationReference: claimReference },
  //     returning: true
  //   }
  // )
  // return affectedRows[0]
}

export async function updatePaymentStatusByClaimRef(claimReference, status) {
  return {}
  // return models.payment.update(
  //   { status },
  //   {
  //     where: {
  //       applicationReference: claimReference
  //     },
  //     returning: true
  //   }
  // )
}
