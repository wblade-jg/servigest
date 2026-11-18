'use strict'

const servicio = require('./service')

// Controladores de catálogos (especialidades y categorías).

// --- Especialidades ---

async function listarEspecialidades (req, res, siguiente) {
  try {
    const resultado = await servicio.listarEspecialidades(req.usuario, req.query)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

async function obtenerEspecialidadPorId (req, res, siguiente) {
  try {
    const especialidad = await servicio.obtenerEspecialidadPorId(req.usuario, req.params.id)
    res.json(especialidad)
  } catch (error) {
    siguiente(error)
  }
}

async function crearEspecialidad (req, res, siguiente) {
  try {
    const especialidad = await servicio.crearEspecialidad(req.usuario, req.body)
    res.status(201).json(especialidad)
  } catch (error) {
    siguiente(error)
  }
}

async function actualizarEspecialidad (req, res, siguiente) {
  try {
    const especialidad = await servicio.actualizarEspecialidad(req.usuario, req.params.id, req.body)
    res.json(especialidad)
  } catch (error) {
    siguiente(error)
  }
}

async function desactivarEspecialidad (req, res, siguiente) {
  try {
    const resultado = await servicio.desactivarEspecialidad(req.usuario, req.params.id)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

// --- Categorías ---

async function listarCategorias (req, res, siguiente) {
  try {
    const resultado = await servicio.listarCategorias(req.usuario, req.query)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

async function obtenerCategoriaPorId (req, res, siguiente) {
  try {
    const categoria = await servicio.obtenerCategoriaPorId(req.usuario, req.params.id)
    res.json(categoria)
  } catch (error) {
    siguiente(error)
  }
}

async function crearCategoria (req, res, siguiente) {
  try {
    const categoria = await servicio.crearCategoria(req.usuario, req.body)
    res.status(201).json(categoria)
  } catch (error) {
    siguiente(error)
  }
}

async function actualizarCategoria (req, res, siguiente) {
  try {
    const categoria = await servicio.actualizarCategoria(req.usuario, req.params.id, req.body)
    res.json(categoria)
  } catch (error) {
    siguiente(error)
  }
}

async function desactivarCategoria (req, res, siguiente) {
  try {
    const resultado = await servicio.desactivarCategoria(req.usuario, req.params.id)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

module.exports = {
  listarEspecialidades,
  obtenerEspecialidadPorId,
  crearEspecialidad,
  actualizarEspecialidad,
  desactivarEspecialidad,
  listarCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  desactivarCategoria
}
