import { config } from '../config.js'
import { getLogger } from '../common/helpers/logging/logger.js'
import { metricsCounter } from '../common/helpers/metrics.js'
import { Agenda } from 'agenda'
import { MongoBackend } from '@agendajs/mongo-backend'
import { requestPaymentStatus } from './request-payment-status.js'

let agenda

const buildMongoUri = () => {
  const mongoUri = config.get('mongo.mongoUrl')
  const dbName = config.get('mongo.databaseName')

  if (mongoUri.includes('/admin')) {
    return mongoUri.replace('/admin', `/${dbName}`)
  }

  return `${mongoUri}${dbName}`
}

const emitMetricEvent = async (jobName) => {
  const formattedJobName = jobName.replaceAll(' ', '-')
  await metricsCounter(`scheduledjobs_${formattedJobName}`)
}

const time = () => {
  return new Date().toTimeString().split(' ')[0]
}

const createAgenda = () => {
  const agenda = new Agenda(
    {
      backend: new MongoBackend({
        address: buildMongoUri(),
        collection: 'scheduledjobs'
      })
    },
    (error) => {
      if (error) {
        getLogger().error(`Agenda Mongo connection error: ${error}`)
      } else {
        getLogger().info('Agenda connected')
      }
    }
  )

  agenda.on('start', (job) => {
    getLogger().info(`Job <${job.attrs.name}> starting at ${time()}`)
  })

  agenda.on('success', (job) => {
    getLogger().info(`Job <${job.attrs.name}> succeeded at ${time()}`)
  })

  agenda.on('fail', async (error, job) => {
    getLogger().error(error, `Job <${job.attrs.name}> failed at ${time()}`)
    await emitMetricEvent(`${job.attrs.name}_failed`)
  })

  return agenda
}

export const startAgendaScheduling = async (dbClient) => {
  getLogger().info('Starting Agenda scheduling')

  agenda = createAgenda()

  const lockLifetimeMs = 120000
  const backoffDelayMs = 30000
  const defaultJobSettings = {
    lockLifetime: lockLifetimeMs,
    priority: 'high',
    attempts: 4,
    backoff: { type: 'exponential', delay: backoffDelayMs },
    shouldSaveResult: false
  }
  const jobs = {
    REQUEST_PAYMENT_STATUS: {
      enabled: config.get('scheduledJobs.requestPaymentStatus.enabled'),
      name: 'request payment status',
      schedule: config.get('scheduledJobs.requestPaymentStatus.schedule')
    }
  }
  getLogger().info(`${JSON.stringify(jobs)}`)

  if (jobs.REQUEST_PAYMENT_STATUS.enabled) {
    agenda.define(
      jobs.REQUEST_PAYMENT_STATUS.name,
      async (job) => {
        await emitMetricEvent(job.attrs.name)
        getLogger().info('Starting request payment status scheduled job')
        const logger = getLogger()
        await requestPaymentStatus(logger, dbClient)
      },
      defaultJobSettings
    )
  }

  await agenda.start()

  let enabledJobCount = 0

  if (jobs.REQUEST_PAYMENT_STATUS.enabled) {
    await agenda.every(
      jobs.REQUEST_PAYMENT_STATUS.schedule,
      jobs.REQUEST_PAYMENT_STATUS.name
    )
    enabledJobCount += 1
  }

  getLogger().info(`Agenda started and ${enabledJobCount} job(s) scheduled`)
}

export const stopAgendaScheduling = async () => {
  if (agenda) {
    await agenda.stop()
  }
  getLogger().info('Agenda stopped')
}
