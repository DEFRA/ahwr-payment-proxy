import { createBlobClient, getCognitoToken } from './storage'
import { streamToBuffer } from './lib/streamToBuffer'
import { BlobClient } from '@azure/storage-blob'
import { ClientAssertionCredential } from '@azure/identity'
import {
  CognitoIdentityClient,
  GetOpenIdTokenForDeveloperIdentityCommand
} from '@aws-sdk/client-cognito-identity'

const mockErrorLogger = jest.fn()
const mockInfoLogger = jest.fn()
const mockWarnLogger = jest.fn()

const mockedLogger = {
  error: mockErrorLogger,
  info: mockInfoLogger,
  warn: mockWarnLogger
}

jest.mock('@azure/identity')
jest.mock('@azure/storage-blob', () => {
  const mockBlobServiceClient = {
    getContainerClient: jest.fn().mockImplementation(() => ({
      getBlobClient: jest.fn().mockImplementation(() => ({
        download: jest.fn().mockResolvedValue({
          readableStreamBody: {
            on: jest.fn(),
            read: jest.fn(),
            [Symbol.asyncIterator]: jest.fn()
          }
        }),
        deleteIfExists: jest.fn().mockResolvedValue({ succeeded: true })
      }))
    }))
  }

  const BlobServiceClient = jest
    .fn()
    .mockImplementation(() => mockBlobServiceClient)
  BlobServiceClient.fromConnectionString = jest
    .fn()
    .mockReturnValue(mockBlobServiceClient)

  return {
    BlobServiceClient,
    BlobClient: jest.fn()
  }
})
jest.mock('./lib/streamToBuffer', () => ({
  streamToBuffer: jest
    .fn()
    .mockResolvedValue(Buffer.from(JSON.stringify({ key: 'value' })))
}))

const mockSend = jest.fn().mockResolvedValue({ Token: 'cognito-token' })
jest.mock('@aws-sdk/client-cognito-identity', () => ({
  CognitoIdentityClient: jest.fn(() => ({
    send: mockSend
  })),
  GetOpenIdTokenForDeveloperIdentityCommand: jest.fn()
}))

jest.mock('./config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'aws.region') return 'us-east-1'
      if (key === 'cognito.poolId') return 'pool-id'
      if (key === 'azure') {
        return { clientId: 'client-id', tenantId: 'tenant-id' }
      }
    })
  }
}))

describe('storage', () => {
  describe('createBlobClient', () => {
    const blobUri = 'https://example.blob.core.windows.net/container/blob.json'

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('getBlob should return parsed JSON from blob', async () => {
      const downloadMock = jest.fn().mockResolvedValue({
        readableStreamBody: {}
      })
      BlobClient.mockImplementation(() => ({
        download: downloadMock
      }))
      streamToBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify({ foo: 'bar' }))
      )

      const client = createBlobClient(mockedLogger, blobUri)
      const data = await client.getBlob()

      expect(BlobClient).toHaveBeenCalledWith(
        blobUri,
        expect.any(ClientAssertionCredential)
      )
      expect(downloadMock).toHaveBeenCalled()
      expect(streamToBuffer).toHaveBeenCalledWith({})
      expect(data).toEqual({ foo: 'bar' })
    })

    test('getBlob should log error and throw if download fails', async () => {
      const error = new Error('Download error')
      BlobClient.mockImplementation(() => ({
        download: jest.fn().mockRejectedValue(error)
      }))

      const client = createBlobClient(mockedLogger, blobUri)

      await expect(client.getBlob()).rejects.toThrow('Download error')
      expect(mockErrorLogger).toHaveBeenCalledWith(
        { err: error },
        `Unable to retrieve blob: ${blobUri}`
      )
    })

    test('deleteBlob should log info and return true on success', async () => {
      const deleteIfExistsMock = jest
        .fn()
        .mockResolvedValue({ succeeded: true })
      BlobClient.mockImplementation(() => ({
        deleteIfExists: deleteIfExistsMock
      }))

      const client = createBlobClient(mockedLogger, blobUri)
      const result = await client.deleteBlob()

      expect(deleteIfExistsMock).toHaveBeenCalled()
      expect(result).toBe(true)
      expect(mockInfoLogger).toHaveBeenCalledWith(
        `Successfully deleted blob: ${blobUri}`
      )
    })

    test('deleteBlob should log warning and return false if blob not found', async () => {
      const deleteIfExistsMock = jest
        .fn()
        .mockResolvedValue({ succeeded: false })
      BlobClient.mockImplementation(() => ({
        deleteIfExists: deleteIfExistsMock
      }))

      const client = createBlobClient(mockedLogger, blobUri)
      const result = await client.deleteBlob()

      expect(deleteIfExistsMock).toHaveBeenCalled()
      expect(result).toBe(false)
      expect(mockWarnLogger).toHaveBeenCalledWith(
        `Blob not found or already deleted: ${blobUri}`
      )
    })

    test('deleteBlob should log error and throw if deletion fails', async () => {
      const error = new Error('Delete error')
      BlobClient.mockImplementation(() => ({
        deleteIfExists: jest.fn().mockRejectedValue(error)
      }))

      const client = createBlobClient(mockedLogger, blobUri)

      await expect(client.deleteBlob()).rejects.toThrow('Delete error')
      expect(mockErrorLogger).toHaveBeenCalledWith(
        { err: error },
        `Unable to delete blob: ${blobUri}`
      )
    })
  })

  describe('getCognitoToken', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('returns token from Cognito', async () => {
      const token = await getCognitoToken()

      expect(token).toBe('cognito-token')
      expect(CognitoIdentityClient).toHaveBeenCalledWith({
        region: 'us-east-1'
      })
      expect(GetOpenIdTokenForDeveloperIdentityCommand).toHaveBeenCalledWith({
        IdentityPoolId: 'pool-id',
        Logins: {
          'ahwr-payment-proxy-aad-access': 'ahwr-payment-proxy'
        }
      })
    })

    test('throws error when AWS SDK fails', async () => {
      mockSend.mockRejectedValue(new Error('AWS error'))

      await expect(getCognitoToken()).rejects.toThrow('AWS error')
    })
  })
})
