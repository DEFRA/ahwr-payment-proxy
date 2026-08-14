import {
  getPaymentDataLivestock,
  getPaymentDataPoultry
} from './getPaymentData.js'

describe('getPaymentDataPoultry', () => {
  test('we can retrieve data', () => {
    const paymentData = getPaymentDataPoultry()

    expect(paymentData).toEqual({ standardCode: 'AHWR-Poultry', value: 430 })
  })
})

describe('getPaymentDataLivestock', () => {
  const dateOfVisit = '2025-04-24T00:00:00.000Z'

  test.each([
    {
      description: 'beef review with noPiHunt test result',
      typeOfLivestock: 'beef',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit,
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 522 }
    },
    {
      description: 'beef positive follow up with noPiHunt test result',
      typeOfLivestock: 'beef',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 837 }
    },
    {
      description: 'beef negative follow up with noPiHunt test result',
      typeOfLivestock: 'beef',
      testResults: 'negative',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 215 }
    },
    {
      description: 'dairy review with noPiHunt negative test result',
      typeOfLivestock: 'dairy',
      testResults: 'negative',
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit,
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Dairy', value: 372 }
    },
    {
      description: 'dairy positive follow up with noPiHunt test result',
      typeOfLivestock: 'dairy',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Dairy', value: 1714 }
    },
    {
      description: 'dairy negative follow up with noPiHunt test result',
      typeOfLivestock: 'dairy',
      testResults: 'negative',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Dairy', value: 215 }
    },
    {
      description: 'beef review with yesPiHunt test result',
      typeOfLivestock: 'beef',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit,
      yesOrNoPiHunt: 'yesPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 522 }
    },
    {
      description: 'beef positive follow up with yesPiHunt test result',
      typeOfLivestock: 'beef',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'yesPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 837 }
    },
    {
      description: 'beef negative follow up with yesPiHunt test result',
      typeOfLivestock: 'beef',
      testResults: 'negative',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'yesPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 837 }
    },
    {
      description: 'dairy review with yesPiHunt negative test result',
      typeOfLivestock: 'dairy',
      testResults: 'negative',
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit,
      yesOrNoPiHunt: 'yesPiHunt',
      expected: { standardCode: 'AHWR-Dairy', value: 372 }
    },
    {
      description: 'dairy positive follow up with yesPiHunt test result',
      typeOfLivestock: 'dairy',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'yesPiHunt',
      expected: { standardCode: 'AHWR-Dairy', value: 1714 }
    },
    {
      description: 'dairy negative follow up with yesPiHunt test result',
      typeOfLivestock: 'dairy',
      testResults: 'negative',
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: 'yesPiHunt',
      expected: { standardCode: 'AHWR-Dairy', value: 1714 }
    },
    {
      description: 'pigs review',
      typeOfLivestock: 'pigs',
      testResults: null,
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Pigs', value: 557 }
    },
    {
      description: 'pigs follow up',
      typeOfLivestock: 'pigs',
      testResults: null,
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Pigs', value: 923 }
    },
    {
      description: 'sheep review without test result',
      typeOfLivestock: 'sheep',
      testResults: null,
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Sheep', value: 436 }
    },
    {
      description: 'sheep follow up without test result',
      typeOfLivestock: 'sheep',
      testResults: null,
      isEndemics: true,
      typeOfClaim: 'FOLLOW_UP',
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Sheep', value: 639 }
    },
    {
      description: 'beef without endemics',
      typeOfLivestock: 'beef',
      testResults: null,
      isEndemics: false,
      typeOfClaim: undefined,
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Beef', value: 522 }
    },
    {
      description: 'dairy without endemics',
      typeOfLivestock: 'dairy',
      testResults: null,
      isEndemics: false,
      typeOfClaim: undefined,
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Dairy', value: 372 }
    },
    {
      description: 'pigs without endemics',
      typeOfLivestock: 'pigs',
      testResults: null,
      isEndemics: false,
      typeOfClaim: undefined,
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Pigs', value: 557 }
    },
    {
      description: 'sheep without endemics',
      typeOfLivestock: 'sheep',
      testResults: null,
      isEndemics: false,
      typeOfClaim: undefined,
      dateOfVisit,
      yesOrNoPiHunt: undefined,
      expected: { standardCode: 'AHWR-Sheep', value: 436 }
    },
    {
      description: 'beef review with payment rate uplift',
      typeOfLivestock: 'beef',
      testResults: 'positive',
      isEndemics: true,
      typeOfClaim: 'REVIEW',
      dateOfVisit: '2026-01-22T00:00:00.000Z',
      yesOrNoPiHunt: 'noPiHunt',
      expected: { standardCode: 'AHWR-Beef', value: 647 }
    }
  ])(
    'returns correct payment data for $description',
    ({
      typeOfLivestock,
      testResults,
      isEndemics,
      typeOfClaim,
      dateOfVisit,
      yesOrNoPiHunt,
      expected
    }) => {
      const paymentData = getPaymentDataLivestock(
        typeOfLivestock,
        testResults,
        isEndemics,
        typeOfClaim,
        dateOfVisit,
        yesOrNoPiHunt
      )

      expect(paymentData).toEqual(expected)
    }
  )
})
