import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from './common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const usePrettyPrint = process.env.USE_PRETTY_PRINT === 'true'
const msgTypePrefix = 'uk.gov.ffc.ahwr'

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'ahwr-payment-proxy'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  aws: {
    region: {
      doc: 'AWS region',
      format: String,
      default: 'eu-west-1',
      env: 'AWS_REGION'
    },
    endpointUrl: {
      doc: 'AWS endpoint URL',
      format: String,
      default: null,
      nullable: true,
      env: 'AWS_ENDPOINT_URL'
    }
  },
  serviceBus: {
    host: {
      doc: 'Host name for the service bus instance',
      format: String,
      default: '',
      env: 'MESSAGE_QUEUE_HOST'
    },
    password: {
      doc: 'Password to connect to the service bus instance',
      format: String,
      default: '',
      sensitive: true,
      env: 'MESSAGE_QUEUE_PASSWORD'
    },
    username: {
      doc: 'Username to connect to the service bus instance',
      format: String,
      default: '',
      sensitive: true,
      env: 'MESSAGE_QUEUE_USER'
    },
    paymentRequestTopic: {
      doc: 'Topic name to send payment requests',
      format: String,
      default: 'ffc-pay-request',
      env: 'PAYMENTREQUEST_TOPIC_ADDRESS'
    },
    submitPaymentRequestMsgType: {
      doc: 'Submit payment request message type',
      format: String,
      default: 'uk.gov.ffc.ahwr.submit.payment.request'
    },
    paymentDataRequestTopic: {
      doc: 'Topic name to send payment requests',
      format: String,
      default: 'ffc-pay-data-request',
      env: 'PAYMENT_DATA_REQUEST_TOPIC_ADDRESS'
    },
    submitPaymentDataRequestMsgType: {
      doc: 'Submit payment request message type',
      format: String,
      default: 'uk.gov.ffc.ahwr.submit.payment.data.request'
    },
    paymentResponseTopic: {
      doc: 'Topic name to send payment requests',
      format: String,
      default: 'ffc-pay-request-response',
      env: 'PAYMENTRESPONSE_TOPIC_ADDRESS'
    },
    paymentResponseSubscription: {
      doc: 'Topic name to send payment requests',
      format: String,
      default: 'ffc-ahwr-application',
      env: 'PAYMENTRESPONSE_SUBSCRIPTION_ADDRESS'
    },
    paymentDataRequestResponseQueue: {
      doc: 'Topic name to send payment requests',
      format: String,
      default: 'ffc-pay-data-request-response',
      env: 'PAYMENT_DATA_REQUEST_RESPONSE_QUEUE_ADDRESS'
    }
  },
  sqs: {
    applicationPaymentRequestQueueUrl: {
      doc: 'URL of the SQS queue to receive application payment requests from',
      format: String,
      default: '#',
      env: 'APPLICATIONPAYMENTREQUEST_QUEUE_ADDRESS_URL'
    }
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: usePrettyPrint ? 'pino-pretty' : 'ecs',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  mongo: {
    mongoUrl: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017/',
      env: 'MONGO_URI'
    },
    databaseName: {
      doc: 'database for mongodb',
      format: String,
      default: 'ahwr-payment-proxy',
      env: 'MONGO_DATABASE'
    },
    mongoOptions: {
      retryWrites: {
        doc: 'Enable Mongo write retries, overrides mongo URI when set.',
        format: Boolean,
        default: null,
        nullable: true,
        env: 'MONGO_RETRY_WRITES'
      },
      readPreference: {
        doc: 'Mongo read preference, overrides mongo URI when set.',
        format: [
          'primary',
          'primaryPreferred',
          'secondary',
          'secondaryPreferred',
          'nearest'
        ],
        default: null,
        nullable: true,
        env: 'MONGO_READ_PREFERENCE'
      }
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  requestPaymentStatusScheduler: {
    enabled: {
      doc: 'Enable request payment status',
      format: Boolean,
      default: false,
      env: 'REQUEST_PAYMENT_STATUS_ENABLED'
    },
    schedule: {
      doc: 'Cron schedule for request payment status job',
      format: String,
      default: '0 11 * * 1-5',
      env: 'REQUEST_PAYMENT_STATUS_SCHEDULE'
    },
    initialAttempts: {
      doc: 'Initial attempts for request payment processing',
      format: 'int',
      default: 3,
      env: 'REQUEST_PAYMENT_INITIAL_ATTEMPTS'
    }
  },
  messageTypes: {
    applicationRequestMsgType: {
      doc: 'Message type for application requests',
      format: String,
      default: `${msgTypePrefix}.app.request`
    },
    moveClaimToPaidMsgType: {
      doc: 'Message type for claim to paid',
      format: String,
      default: `${msgTypePrefix}.set.paid.status`
    }
  },
  sns: {
    paymentUpdateTopicArn: {
      doc: 'ARN of the topic to send payment update events to',
      format: String,
      default: '#',
      env: 'PAYMENT_UPDATE_TOPIC_ARN'
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
