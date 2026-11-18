import * as servicio from './service.js'

const COOKIE_SESION = 'sg_session'

// Opciones de la cookie de sesión: httpOnly, SameSite=Lax y Secure en producción.
function opcionesCookie (seguro) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(seguro),
    path: '/',
    maxAge: servicio.HORAS_SESION * 60 * 60 * 1000
  }
}

async function login (req, res, siguiente) {
  try {
    const resultado = await servicio.iniciarSesion({
      email: req.body?.email,
      password: req.body?.password,
      ip: req.ip,
      userAgent: req.get('user-agent')
    })
    res.cookie(COOKIE_SESION, resultado.token, opcionesCookie(req.secure))
    res.json({
      usuario: resultado.usuario,
      csrfToken: resultado.csrfToken,
      expiraEn: resultado.expiraEn
    })
  } catch (error) { siguiente(error) }
}

async function logout (req, res, siguiente) {
  try {
    await servicio.cerrarSesion(req.sesion.id)
    res.clearCookie(COOKIE_SESION, { path: '/' })
    res.status(204).end()
  } catch (error) { siguiente(error) }
}

function me (req, res) {
  res.json({
    usuario: req.usuario,
    csrfToken: req.sesion.csrfSecret
  })
}

async function cambiarPassword (req, res, siguiente) {
  try {
    await servicio.cambiarPassword({
      usuarioId: req.usuario.id,
      actual: req.body?.actual,
      nueva: req.body?.nueva
    })
    res.status(204).end()
  } catch (error) { siguiente(error) }
}

export { login, logout, me, cambiarPassword, COOKIE_SESION, opcionesCookie }
