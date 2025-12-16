import { endemicsPaymentTypes } from '../constants/index.js'
import {
  prices,
  claimType as CLAIM_TYPE,
  basicTestResultStatus,
  TYPE_OF_LIVESTOCK
} from 'ffc-ahwr-common-library'

export const getPaymentData = (
  typeOfLivestock,
  testResults,
  isEndemics,
  claimType,
  yesOrNoPiHunt
) => {
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
