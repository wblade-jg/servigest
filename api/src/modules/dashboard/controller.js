import * as servicio from './service.js'

async function obtener (req, res, siguiente) {
  try {
    res.json(await servicio.obtener(req.usuario))
  } catch (error) { siguiente(error) }
}

export { obtener }
