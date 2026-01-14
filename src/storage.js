import { BlobClient } from '@azure/storage-blob'
import { ClientAssertionCredential } from '@azure/identity'
import { streamToBuffer } from './lib/streamToBuffer.js'
import { config } from './config.js'
import {
  CognitoIdentityClient,
  GetOpenIdTokenForDeveloperIdentityCommand
} from '@aws-sdk/client-cognito-identity'

const LOGINS = {
  'ahwr-payment-proxy-aad-access': 'ahwr-payment-proxy'
}

export const getCognitoToken = async () => {
  const cognitoClient = new CognitoIdentityClient({
    region: config.get('aws.region')
  })
  const command = new GetOpenIdTokenForDeveloperIdentityCommand({
    IdentityPoolId: config.get('cognito.poolId'),
    Logins: LOGINS
  })
  const result = await cognitoClient.send(command)
  return result?.Token
}

export const createBlobClient = (logger, blobUri) => {
  const { clientId, tenantId } = config.get('azure')

  const blobClient = new BlobClient(
    blobUri,
    new ClientAssertionCredential(tenantId, clientId, getCognitoToken)
  )

  const getBlob = async () => {
    try {
      const downloadResponse = await blobClient.download()
      const downloaded = await streamToBuffer(
        downloadResponse.readableStreamBody
      )
      return JSON.parse(downloaded.toString())
    } catch (err) {
      logger.error({ err }, `Unable to retrieve blob: ${blobUri}`)
      throw err
    }
  }

  const deleteBlob = async () => {
    try {
      const deleteResponse = await blobClient.deleteIfExists()

      if (deleteResponse.succeeded) {
        logger.info(`Successfully deleted blob: ${blobUri}`)
      } else {
        logger.warn(`Blob not found or already deleted: ${blobUri}`)
      }

      return deleteResponse.succeeded
    } catch (err) {
      logger.error({ err }, `Unable to delete blob: ${blobUri}`)
      throw err
    }
  }

  return {
    getBlob,
    deleteBlob
  }
}
