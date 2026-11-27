import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, Stack, Typography } from '@mui/material'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Boton, Campo, Entrada, ErrorPanel, Pagina } from '../../components/ui/primitivos'

const MENSAJES: Record<string, string> = {
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  CUENTA_BLOQUEADA: 'La cuenta está bloqueada por intentos fallidos. Inténtalo en 15 minutos.',
  LIMITE_LOGIN: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
}

function rutaPermitidaParaRol(rol?: string, ruta?: string): boolean {
  if (!ruta || !ruta.startsWith('/app')) return false
  if (ruta === '/app') return true
  if (rol === 'TECNICO') {
    return ruta.startsWith('/app/agenda')
  }
  if (rol === 'CLIENTE') {
    return ruta.startsWith('/app/mis-solicitudes') || ruta === '/app/dashboard'
  }
  if (rol === 'COORDINADOR') {
    return ruta.startsWith('/app/solicitudes') || ruta === '/app/dashboard'
  }
  if (rol === 'ADMIN') {
    return !ruta.startsWith('/app/mis-solicitudes') && !ruta.startsWith('/app/agenda')
  }
  return false
}

function calcularDestino(rol?: string, from?: string): string {
  if (rol && rutaPermitidaParaRol(rol, from)) {
    return from!
  }
  if (rol === 'TECNICO') return '/app/agenda'
  if (rol === 'CLIENTE') return '/app/mis-solicitudes'
  return '/app/solicitudes'
}

export default function Login() {
  const { login, usuario } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const rawFrom = (ubicacion.state as { from?: string } | null)?.from
  const destino = calcularDestino(usuario?.rol, rawFrom)

  useEffect(() => {
    if (usuario) {
      navegar(destino, { replace: true })
    }
  }, [usuario, destino, navegar])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'ERROR_INTERNO'
      setError(MENSAJES[code] ?? 'No se pudo iniciar sesión.')
    } finally {
      setEnviando(false)
    }
  }

  // Sesión activa: fuera de la pantalla de login.
  if (usuario) {
    return null
  }

  return (
    <Pagina maxWidth="xs">
      <Typography variant="h2">Ingresar al portal</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Accede con tu cuenta de ServiGest Ecuador.
      </Typography>

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Stack component="form" onSubmit={enviar} spacing={2.5} noValidate>
            {error && <ErrorPanel mensaje={error} />}
            <Campo label="Correo electrónico">
              <Entrada
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com.ec"
              />
            </Campo>
            <Campo label="Contraseña">
              <Entrada
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Campo>
            <Boton type="submit" fullWidth disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </Boton>
          </Stack>
        </CardContent>
      </Card>
    </Pagina>
  )
}
