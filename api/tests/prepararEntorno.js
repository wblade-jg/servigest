// Configuración previa a las pruebas. Jest ejecuta este archivo (setupFiles)
// antes de importar los módulos de cada suite: así `config/pool.js` ya ve la
// URL de la base de datos de prueba. dotenv no sobreescribe variables existentes.

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgres://servigest:servigest@localhost:5432/servigest_test'
