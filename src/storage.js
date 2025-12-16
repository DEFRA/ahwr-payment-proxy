import { BlobClient } from '@azure/storage-blob'
import { DefaultAzureCredential } from '@azure/identity'
import { streamToBuffer } from './lib/streamToBuffer.js'

export const createBlobClient = (logger, blobUri) => {
  const blobClient = new BlobClient(
    blobUri,
    new DefaultAzureCredential({
      managedIdentityClientId: process.env.AZURE_CLIENT_ID
    })
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
