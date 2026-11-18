'use strict'

const servicio = require('./service')
const { ApiError } = require('../../middlewares/errores')

const UID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function asegurarIdValido (req) {
  if (!UID_RE.test(req.params.id || '')) {
    throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
  }
}

async function listar (req, res, siguiente) {
  try {
    res.json(await servicio.listar(req.usuario, req.query))
  } catch (error) { siguiente(error) }
}

async function obtener (req, res, siguiente) {
  try {
    asegurarIdValido(req)
    res.json(await servicio.obtenerDetalle(req.usuario, req.params.id))
  } catch (error) { siguiente(error) }
}

async function crear (req, res, siguiente) {
  try {
    const resultado = await servicio.crearSolicitud(req.usuario, req.body || {})
    res.status(201).json(resultado)
  } catch (error) { siguiente(error) }
}

async function transicionar (req, res, siguiente) {
  try {
    asegurarIdValido(req)
    const { estado, ...resto } = req.body || {}
    if (!estado) {
      throw new ApiError(400, 'ESTADO_REQUERIDO', 'El campo estado es obligatorio.', { campos: ['estado'] })
    }
    res.json(await servicio.transicionarEstado(req.usuario, req.params.id, estado, resto))
  } catch (error) { siguiente(error) }
}

async function eventos (req, res, siguiente) {
  try {
    asegurarIdValido(req)
    res.json({ data: await servicio.listarEventos(req.usuario, req.params.id) })
  } catch (error) { siguiente(error) }
}

async function notas (req, res, siguiente) {
  try {
    asegurarIdValido(req)
    res.json({ data: await servicio.listarNotas(req.usuario, req.params.id) })
  } catch (error) { siguiente(error) }
}

async function crearNota (req, res, siguiente) {
  try {
    asegurarIdValido(req)
    const nota = await servicio.agregarNota(req.usuario, req.params.id, req.body)
    res.status(201).json(nota)
  } catch (error) { siguiente(error) }
}

async function regenerarToken (req, res, siguiente) {
  try {
    asegurarIdValido(req)
    res.json(await servicio.regenerarToken(req.usuario, req.params.id))
  } catch (error) { siguiente(error) }
}

module.exports = {
  listar,
  obtener,
  crear,
  transicionar,
  eventos,
  notas,
  crearNota,
  regenerarToken
}
