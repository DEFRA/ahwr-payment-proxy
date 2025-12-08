import { health } from '../routes/health.js'
import { paymentApiRoutes } from '../routes/api/payment.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health].concat(paymentApiRoutes))
    }
  }
}

export { router }
