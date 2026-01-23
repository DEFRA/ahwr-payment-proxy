import { health } from '../routes/health.js'
import { paymentApiRoutes } from '../routes/api/payment.js'
import { supportRoutes } from '../routes/api/support/support-routes.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, ...paymentApiRoutes, ...supportRoutes])
    }
  }
}

export { router }
