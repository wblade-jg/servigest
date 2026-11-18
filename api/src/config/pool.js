import { Pool } from 'pg'
import { entorno } from './entorno.js'

// Pool compartido para toda la API.
const pool = new Pool({ connectionString: entorno.databaseUrl })

export { pool }
