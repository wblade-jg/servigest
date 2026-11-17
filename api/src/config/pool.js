'use strict'

const { Pool } = require('pg')
const { entorno } = require('./entorno')

// Pool compartido para toda la API.
const pool = new Pool({ connectionString: entorno.databaseUrl })

module.exports = { pool }
