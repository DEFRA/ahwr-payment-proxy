import Boom from '@hapi/boom'
import { config } from '../config.js'

export const authPlugin = {
  plugin: {
    name: 'auth',
    register: async (server, _options) => {
      // Setup credentials
      const API_KEYS = { [config.get('apiKeys.backofficeUi')]: 'backoffice-ui' }

      const apiKeyScheme = () => ({
        authenticate(request, h) {
          const apiKey = request.headers['x-api-key']
          const service = API_KEYS[apiKey]

          if (!apiKey || !service) {
            throw Boom.unauthorized('Invalid API key')
          }

          return h.authenticated({ credentials: { app: service } })
        }
      })

      server.auth.scheme('api-key', apiKeyScheme)
      server.auth.strategy('service-key', 'api-key')
      server.auth.default('service-key') // apply to all routes
    }
  }
}
