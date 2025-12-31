import {
  get,
  getPendingPayments,
  incrementPaymentCheckCount,
  set,
  updatePaymentResponse,
  updatePaymentStatusByClaimRef
} from './payment-repository'

beforeEach(() => {
  jest.clearAllMocks()
})

const reference = 'AHWR-1234-567'

describe('Payment Repository test', () => {
  const mockToArray = jest.fn()
  const mockCollection = {
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(() => ({ toArray: mockToArray })),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
  }
  const mockDb = {
    collection: jest.fn(() => mockCollection)
  }

  test('Set creates record for data', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-04-15T00:00:00Z'))

    await set(mockDb, reference, { agreementNumber: reference }, '111343946890')

    expect(mockCollection.insertOne).toHaveBeenCalledTimes(1)
    expect(mockCollection.insertOne).toHaveBeenCalledWith({
      reference,
      data: { agreementNumber: reference },
      frn: '111343946890',
      createdAt: new Date('2025-04-15T00:00:00Z'),
      paymentCheckCount: 0
    })
  })

  test('Update record for data by reference', async () => {
    const paymentResponse = {
      agreementNumber: reference,
      value: 43600,
      invoiceLines: [
        {
          value: 43600
        }
      ],
      frn: 1102354669
    }

    await updatePaymentResponse(mockDb, reference, 'completed', paymentResponse)

    expect(mockCollection.updateOne).toHaveBeenCalledTimes(1)
    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { reference },
      {
        $set: {
          status: 'completed',
          paymentResponse,
          frn: 1102354669
        }
      }
    )
  })

  test('get returns single data by reference', async () => {
    await get(mockDb, reference)

    expect(mockCollection.findOne).toHaveBeenCalledTimes(1)
    expect(mockCollection.findOne).toHaveBeenCalledWith(
      { reference },
      { projection: { _id: 0 } }
    )
  })

  test('getPendingPayments calls findAll with correct params', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-04-15T00:00:00Z'))
    mockToArray.mockResolvedValue(['payment1', 'payment2'])

    const result = await getPendingPayments(mockDb)

    expect(mockCollection.find).toHaveBeenCalledWith({
      $or: [
        {
          status: 'ack',
          paymentCheckCount: { $lt: 3 },
          frn: { $exists: true, $ne: '' },
          createdAt: { $lte: new Date('2025-04-14T00:00:00Z') }
        },
        {
          status: 'ack',
          paymentCheckCount: 3,
          updatedAt: {
            $lte: new Date('2025-04-05T00:00:00Z')
          }
        }
      ]
    })
    expect(result).toEqual(['payment1', 'payment2'])
  })

  test('incrementPaymentCheckCount calls increment with correct params', async () => {
    const payment = {
      id: '32742adb-f37d-4bc8-8927-7f7d7cfc685e',
      reference: 'RESH-F99F-E09F',
      data: {
        sbi: '234234',
        value: 436,
        invoiceLines: [
          {
            value: 436,
            description: 'G00 - Gross value of claim',
            standardCode: 'AHWR-Sheep'
          }
        ],
        sourceSystem: 'AHWR',
        marketingYear: 2025,
        agreementNumber: 'ABC-1234',
        paymentRequestNumber: 1
      },
      createdAt: '2025-06-25T08:24:56.309Z',
      updatedAt: '2025-07-11T15:49:20.297Z',
      status: 'ack',
      paymentResponse: [{}],
      paymentCheckCount: '4',
      frn: '12345'
    }
    mockCollection.findOneAndUpdate.mockResolvedValue(payment)

    const result = await incrementPaymentCheckCount(mockDb, 'RESH-F99F-E09F')

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { reference: 'RESH-F99F-E09F' },
      { $inc: { paymentCheckCount: 1 } },
      { returnDocument: 'after' }
    )
    expect(result).toEqual(payment)
  })

  test('updatePaymentStatusByClaimRef calls update with correct params', async () => {
    const payment = {
      id: '32742adb-f37d-4bc8-8927-7f7d7cfc685e',
      reference: 'RESH-F99F-E09F',
      data: {
        sbi: '234234',
        value: 436,
        invoiceLines: [
          {
            value: 436,
            description: 'G00 - Gross value of claim',
            standardCode: 'AHWR-Sheep'
          }
        ],
        sourceSystem: 'AHWR',
        marketingYear: 2025,
        agreementNumber: 'ABC-1234',
        paymentRequestNumber: 1
      },
      createdAt: '2025-06-25T08:24:56.309Z',
      updatedAt: '2025-07-11T15:49:20.297Z',
      status: 'failed',
      paymentResponse: [{}],
      paymentCheckCount: '4',
      frn: '12345'
    }
    mockCollection.findOneAndUpdate.mockResolvedValue(payment)

    const result = await updatePaymentStatusByClaimRef(
      mockDb,
      'RESH-F99F-E09F',
      'failed'
    )

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { reference: 'RESH-F99F-E09F' },
      { $set: { status: 'failed' } },
      { returnDocument: 'after' }
    )
    expect(result).toEqual(payment)
  })
})
