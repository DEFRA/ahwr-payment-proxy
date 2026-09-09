// Blocks until the Service Bus Emulator is actually accepting AMQP
// connections, so `docker compose up` doesn't race ahead and start the app
// before the emulator (and the SQL Server backend it depends on) has
// finished its own ~20s+ startup/health-check cycle.
//
// Only used locally - see compose.yml. Skips itself when
// SERVICE_BUS_USE_EMULATOR isn't set, so it's a no-op against real Azure.

const net = require('net')

const host = process.env.MESSAGE_QUEUE_HOST
const port = 5672
const timeoutMs = 2000
const intervalMs = 2000
const maxWaitMs = 120000

if (process.env.SERVICE_BUS_USE_EMULATOR !== 'true') {
  process.exit(0)
}

const tryConnect = () =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs })
    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })

async function main () {
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    if (await tryConnect()) {
      console.log(`Service Bus Emulator is up (${host}:${port})`)
      return
    }
    console.log(`Waiting for Service Bus Emulator at ${host}:${port}...`)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  console.log(
    `Gave up waiting for Service Bus Emulator at ${host}:${port} after ${maxWaitMs}ms - starting anyway.`
  )
}

main()
