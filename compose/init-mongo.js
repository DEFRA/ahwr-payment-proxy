/* global db */

// Switch to (or create) a database, e.g. "testdb"
/* eslint-disable-next-line no-global-assign */
db = db.getSiblingDB('ahwr-payment-proxy')

db.createCollection('payments')
