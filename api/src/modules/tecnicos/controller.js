import * as servicio from './service.js'

// Controladores de técnicos.

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
    const tecnico = await servicio.obtenerPorId(req.usuario, req.params.id)
    res.json(tecnico)
  } catch (error) {
    siguiente(error)
  }
}

async function habilitar (req, res, siguiente) {
  try {
    const tecnico = await servicio.habilitar(req.usuario, req.body)
    res.status(201).json(tecnico)
  } catch (error) {
    siguiente(error)
  }
}

async function actualizar (req, res, siguiente) {
  try {
    const tecnico = await servicio.actualizar(req.usuario, req.params.id, req.body)
    res.json(tecnico)
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

async function asignarEspecialidades (req, res, siguiente) {
  try {
    const resultado = await servicio.asignarEspecialidades(
      req.usuario,
      req.params.id,
      req.body.especialidadIds
    )
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

async function listarDisponibilidad (req, res, siguiente) {
  try {
    const disponibilidad = await servicio.listarDisponibilidad(req.usuario, req.params.id)
    res.json({ data: disponibilidad })
  } catch (error) {
    siguiente(error)
  }
}

async function crearDisponibilidad (req, res, siguiente) {
  try {
    const franja = await servicio.crearDisponibilidad(req.usuario, req.params.id, req.body)
    res.status(201).json(franja)
  } catch (error) {
    siguiente(error)
  }
}

async function actualizarDisponibilidad (req, res, siguiente) {
  try {
    const franja = await servicio.actualizarDisponibilidad(req.usuario, req.params.franjaId, req.body)
    res.json(franja)
  } catch (error) {
    siguiente(error)
  }
}

async function desactivarDisponibilidad (req, res, siguiente) {
  try {
    const resultado = await servicio.desactivarDisponibilidad(req.usuario, req.params.franjaId)
    res.json(resultado)
  } catch (error) {
    siguiente(error)
  }
}

export {
  listar,
  obtenerPorId,
  habilitar,
  actualizar,
  desactivar,
  asignarEspecialidades,
  listarDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  desactivarDisponibilidad
}
