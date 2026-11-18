'use strict'

const servicio = require('./service')

// Controladores de organizaciones.

async function listar (req, res, siguiente) {
  try {
    const resultado = await servicio.listar(req.usuario, req.query)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

async function obtenerPorId (req, res, siguiente) {
  try {
    const organizacion = await servicio.obtenerPorId(req.usuario, req.params.id)
    res.json(organizacion)
  } catch (error) {
    siguiente(error)
  }
}

async function crear (req, res, siguiente) {
  try {
    const organizacion = await servicio.crear(req.usuario, req.body)
    res.status(201).json(organizacion)
  } catch (error) {
    siguiente(error)
  }
}

async function actualizar (req, res, siguiente) {
  try {
    const organizacion = await servicio.actualizar(req.usuario, req.params.id, req.body)
    res.json(organizacion)
  } catch (error) {
    siguiente(error)
  }
}

async function desactivar (req, res, siguiente) {
  try {
    const resultado = await servicio.desactivar(req.usuario, req.params.id)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar
}
