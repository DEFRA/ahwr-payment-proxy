import {
  endemicsPaymentTypes,
  PIGS_AND_PAYMENTS_RELEASE_DATE
} from '../constants/index.js'
import {
  pricesOriginal,
  pricesUplifted,
  claimType as CLAIM_TYPE,
  basicTestResultStatus,
  TYPE_OF_LIVESTOCK
} from 'ffc-ahwr-common-library'

export const isPostPaymentRateUplift = (dateOfVisit) => {
  return new Date(dateOfVisit) >= PIGS_AND_PAYMENTS_RELEASE_DATE
}

export const getPaymentData = (
  typeOfLivestock,
  testResults,
  isEndemics,
  claimType,
  dateOfVisit,
  yesOrNoPiHunt
) => {
  const prices = isPostPaymentRateUplift(dateOfVisit)
    ? pricesUplifted
    : pricesOriginal

  if (isEndemics) {
    const isFollowUp = claimType === CLAIM_TYPE.endemics
    const endemicsPaymentType = isFollowUp
      ? endemicsPaymentTypes.followUp
      : endemicsPaymentTypes.review
    const standardCode = prices[endemicsPaymentType][typeOfLivestock].code

    if (
      (typeOfLivestock === TYPE_OF_LIVESTOCK.BEEF ||
        typeOfLivestock === TYPE_OF_LIVESTOCK.DAIRY) &&
      testResults &&
      isFollowUp
    ) {
      if (testResults === basicTestResultStatus.negative) {
        return {
          standardCode,
          value: yesOrNoPiHunt
            ? prices[endemicsPaymentType][typeOfLivestock].value[testResults][
                yesOrNoPiHunt
              ]
            : prices[endemicsPaymentType][typeOfLivestock].value[testResults]
                .noPiHunt
        }
      }
      return {
        standardCode,
        value: prices[endemicsPaymentType][typeOfLivestock].value[testResults]
      }
    } else {
      return {
        standardCode,
        value: prices[endemicsPaymentType][typeOfLivestock].value
      }
    }
  }
  // Note that 'isEndemic' will never be false anymore as we don't allow claim of old world claims. This should be tidied up in a different PR.
  const nonEnedmicsStandardCode = prices.review[typeOfLivestock]?.code
  const value = prices.review[typeOfLivestock]?.value
  return {
    standardCode: nonEnedmicsStandardCode,
    value
  }
}
