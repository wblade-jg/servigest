'use strict'

const servicio = require('./service')

async function iniciar (req, res, siguiente) {
  try {
    const resultado = await servicio.iniciar(req.usuario, req.params.id)
    res.status(201).json(resultado)
  } catch (error) { siguiente(error) }
}

async function resolver (req, res, siguiente) {
  try {
    res.json(await servicio.resolver(req.usuario, req.params.id, req.body || {}))
  } catch (error) { siguiente(error) }
}

async function listar (req, res, siguiente) {
  try {
    res.json({ data: await servicio.listar(req.usuario, req.params.id) })
  } catch (error) { siguiente(error) }
}

module.exports = { iniciar, resolver, listar }
