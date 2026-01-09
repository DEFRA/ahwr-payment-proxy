import {
  DAILY_RETRY_FROM_DAYS,
  DAILY_RETRY_LIMIT,
  FINAL_RETRY_DAYS,
  Status,
  PAYMENTS_COLLECTION
} from '../constants/index.js'
import { subDays } from 'date-fns'

export async function get(db, reference) {
  return db
    .collection(PAYMENTS_COLLECTION)
    .findOne({ reference }, { projection: { _id: 0 } })
}

export async function set(db, reference, data, frn) {
  return db.collection(PAYMENTS_COLLECTION).insertOne({
    reference,
    data,
    frn,
    createdAt: new Date(),
    paymentCheckCount: 0,
    status: Status.REQUESTED
  })
}

export async function updatePaymentResponse(
  db,
  reference,
  status,
  paymentResponse
) {
  return db.collection(PAYMENTS_COLLECTION).updateOne(
    { reference },
    {
      $set: {
        status,
        paymentResponse,
        frn: paymentResponse.frn
      }
    }
  )
}

export async function getPendingPayments(db) {
  return db
    .collection(PAYMENTS_COLLECTION)
    .find({
      $or: [
        {
          status: Status.ACK,
          paymentCheckCount: { $lt: DAILY_RETRY_LIMIT },
          frn: { $exists: true, $ne: '' },
          createdAt: {
            $lte: subDays(new Date(), DAILY_RETRY_FROM_DAYS)
          }
        },
        {
          status: Status.ACK,
          paymentCheckCount: DAILY_RETRY_LIMIT,
          updatedAt: {
            $lte: subDays(new Date(), FINAL_RETRY_DAYS)
          }
        }
      ]
    })
    .toArray()
}

export async function incrementPaymentCheckCount(db, claimReference) {
  return db
    .collection(PAYMENTS_COLLECTION)
    .findOneAndUpdate(
      { reference: claimReference },
      { $inc: { paymentCheckCount: 1 } },
      { returnDocument: 'after' }
    )
}

export async function updatePaymentStatusByClaimRef(
  db,
  claimReference,
  status
) {
  return db
    .collection(PAYMENTS_COLLECTION)
    .findOneAndUpdate(
      { reference: claimReference },
      { $set: { status } },
      { returnDocument: 'after' }
    )
}
