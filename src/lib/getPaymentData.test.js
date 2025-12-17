import { getPaymentData } from './getPaymentData.js'

describe('getPaymentData', () => {
  test('returns correct payment data for beef review with test result', () => {
    const typeOfLivestock = 'beef'
    const testResults = 'positive'
    const isEndemics = true
    const yesOrNoPiHunt = 'noPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'REVIEW',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 522
    })
  })

  test('returns correct payment data for beef positive follow up with test result', () => {
    const typeOfLivestock = 'beef'
    const testResults = 'positive'
    const isEndemics = true
    const yesOrNoPiHunt = 'noPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 837
    })
  })

  test('returns correct payment data for beef negative follow up with test result', () => {
    const typeOfLivestock = 'beef'
    const testResults = 'negative'
    const isEndemics = true
    const yesOrNoPiHunt = 'noPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 215
    })
  })

  test('returns correct payment data for review dairy with negative test result', () => {
    const typeOfLivestock = 'dairy'
    const testResults = 'negative'
    const isEndemics = true
    const yesOrNoPiHunt = 'noPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'REVIEW',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 372
    })
  })

  test('returns correct payment data for dairy positive follow up with test result', () => {
    const typeOfLivestock = 'dairy'
    const testResults = 'positive'
    const isEndemics = true
    const yesOrNoPiHunt = 'noPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 1714
    })
  })

  test('returns correct payment data for dairy negative follow up with test result', () => {
    const typeOfLivestock = 'dairy'
    const testResults = 'negative'
    const isEndemics = true
    const yesOrNoPiHunt = 'noPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 215
    })
  })

  test('returns correct payment data for beef review with test result', () => {
    const typeOfLivestock = 'beef'
    const testResults = 'positive'
    const isEndemics = true
    const yesOrNoPiHunt = 'yesPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'REVIEW',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 522
    })
  })

  test('returns correct payment data for beef positive follow up with test result', () => {
    const typeOfLivestock = 'beef'
    const testResults = 'positive'
    const isEndemics = true
    const yesOrNoPiHunt = 'yesPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 837
    })
  })

  test('returns correct payment data for beef negative follow up with test result', () => {
    const typeOfLivestock = 'beef'
    const testResults = 'negative'
    const isEndemics = true
    const yesOrNoPiHunt = 'yesPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 837
    })
  })

  test('returns correct payment data for review dairy with negative test result', () => {
    const typeOfLivestock = 'dairy'
    const testResults = 'negative'
    const isEndemics = true
    const yesOrNoPiHunt = 'yesPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'REVIEW',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 372
    })
  })

  test('returns correct payment data for dairy positive follow up with test result', () => {
    const typeOfLivestock = 'dairy'
    const testResults = 'positive'
    const isEndemics = true
    const yesOrNoPiHunt = 'yesPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 1714
    })
  })

  test('returns correct payment data for dairy negative follow up with test result', () => {
    const typeOfLivestock = 'dairy'
    const testResults = 'negative'
    const isEndemics = true
    const yesOrNoPiHunt = 'yesPiHunt'

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP',
      yesOrNoPiHunt
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 1714
    })
  })

  test('returns correct payment data for pigs review', () => {
    const typeOfLivestock = 'pigs'
    const testResults = null
    const isEndemics = true

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'REVIEW'
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Pigs',
      value: 557
    })
  })
  test('returns correct payment data for pigs follow up', () => {
    const typeOfLivestock = 'pigs'
    const testResults = null
    const isEndemics = true

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP'
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Pigs',
      value: 923
    })
  })

  test('returns correct payment data for sheep review without test result', () => {
    const typeOfLivestock = 'sheep'
    const testResults = null
    const isEndemics = true

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'REVIEW'
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Sheep',
      value: 436
    })
  })

  test('returns correct payment data for sheep follow up without test result', () => {
    const typeOfLivestock = 'sheep'
    const testResults = null
    const isEndemics = true

    const paymentData = getPaymentData(
      typeOfLivestock,
      testResults,
      isEndemics,
      'FOLLOW_UP'
    )

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Sheep',
      value: 639
    })
  })

  test('returns correct payment data for beef without endemics', () => {
    const typeOfLivestock = 'beef'
    const testResults = null
    const isEndemics = false

    const paymentData = getPaymentData(typeOfLivestock, testResults, isEndemics)

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Beef',
      value: 522
    })
  })

  test('returns correct payment data for dairy without endemics', () => {
    const typeOfLivestock = 'dairy'
    const testResults = null
    const isEndemics = false

    const paymentData = getPaymentData(typeOfLivestock, testResults, isEndemics)

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Dairy',
      value: 372
    })
  })

  test('returns correct payment data for pigs without endemics', () => {
    const typeOfLivestock = 'pigs'
    const testResults = null
    const isEndemics = false

    const paymentData = getPaymentData(typeOfLivestock, testResults, isEndemics)

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Pigs',
      value: 557
    })
  })

  test('returns correct payment data for sheep without endemics', () => {
    const typeOfLivestock = 'sheep'
    const testResults = null
    const isEndemics = false

    const paymentData = getPaymentData(typeOfLivestock, testResults, isEndemics)

    expect(paymentData).toEqual({
      standardCode: 'AHWR-Sheep',
      value: 436
    })
  })
})
