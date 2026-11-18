'use strict'

const servicio = require('./service')

async function obtener (req, res, siguiente) {
  try {
    res.json(await servicio.obtener(req.usuario))
  } catch (error) { siguiente(error) }
}

module.exports = { obtener }
