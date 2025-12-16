import { validateInboundMessageRequest } from './schemas.js'

describe('schemas', () => {
  describe('validate inbound schema', () => {
    it('return true for a valid inbound message', () => {
      const mockLogger = {
        info: jest.fn()
      }
      const result = validateInboundMessageRequest(mockLogger, {
        crn: '1234567890',
        sbi: '123456789',
        agreementReference: 'IAHW-1234-5678',
        claimReference: 'REBC-1234-5678',
        notifyTemplateId: '82d7dcd7-c6d9-49d4-ab7d-c203234fb579',
        emailReplyToId: '82d7dcd7-c6d9-49d4-ab7d-c203234fb579',
        emailAddress: 'something@somewhere.net',
        customParams: {},
        dateTime: new Date()
      })

      expect(result).toBe(true)
    })

    it('return false for an invalid inbound message', () => {
      const mockLogger = {
        error: jest.fn()
      }
      const result = validateInboundMessageRequest(mockLogger, {
        crn: '1234567890',
        sbi: '123456789',
        notifyTemplateId: '82d7dcd7-c6d9-49d4-ab7d-c203234fb579',
        emailReplyToId: '82d7dcd7-c6d9-49d4-ab7d-c203234fb579',
        emailAddress: 'something@somewhere.net',
        customParams: {},
        dateTime: new Date()
      })

      expect(result).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Message request validation error [{"message":"\\"agreementReference\\" is required","path":["agreementReference"],"type":"any.required","context":{"label":"agreementReference","key":"agreementReference"}}]'
      )
    })
  })
})
