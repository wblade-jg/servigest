import * as servicio from './service.js'

// Controladores de usuarios.

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
    const usuario = await servicio.obtenerPorId(req.usuario, req.params.id)
    res.json(usuario)
  } catch (error) {
    siguiente(error)
  }
}

async function crear (req, res, siguiente) {
  try {
    const usuario = await servicio.crear(req.usuario, req.body)
    res.status(201).json(usuario)
  } catch (error) {
    siguiente(error)
  }
}

async function actualizar (req, res, siguiente) {
  try {
    const usuario = await servicio.actualizar(req.usuario, req.params.id, req.body)
    res.json(usuario)
  } catch (error) {
    siguiente(error)
  }
}

async function cambiarPassword (req, res, siguiente) {
  try {
    const resultado = await servicio.cambiarPassword(req.usuario, req.params.id, req.body)
    res.json(resultado)
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

export {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarPassword,
  desactivar
}
