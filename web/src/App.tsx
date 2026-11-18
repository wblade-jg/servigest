import { Route, Routes, Navigate } from 'react-router-dom'
import Inicio from './app/pages/Inicio'
import Servicios from './app/pages/Servicios'
import Planes from './app/pages/Planes'
import Solicitar from './app/pages/Solicitar'
import Seguimiento from './app/pages/Seguimiento'
import Contacto from './app/pages/Contacto'
import PublicLayout from './app/layouts/PublicLayout'
import EnConstruccion from './app/pages/EnConstruccion'
import Login from './app/pages/Login'
import Bandeja from './app/pages/solicitudes/Bandeja'
import Detalle from './app/pages/solicitudes/Detalle'
import MiAgenda from './app/pages/tecnico/MiAgenda'
import Dashboard from './app/pages/Dashboard'
import MisSolicitudes from './app/pages/cliente/MisSolicitudes'
import NuevaSolicitud from './app/pages/cliente/NuevaSolicitud'
import DetalleCliente from './app/pages/cliente/DetalleCliente'
import Organizaciones from './app/pages/admin/Organizaciones'
import Usuarios from './app/pages/admin/Usuarios'
import Tecnicos from './app/pages/admin/Tecnicos'
import Catalogos from './app/pages/admin/Catalogos'
import { RequireAuth, RequireRol } from './app/layouts/PortalGuardas'
import { useAuth } from './lib/auth'

// Redirección inicial según el rol: técnico a su agenda, cliente a sus solicitudes.
function InicioPortal() {
  const { usuario } = useAuth()
  const destino = usuario?.rol === 'TECNICO'
    ? '/app/agenda'
    : usuario?.rol === 'CLIENTE'
      ? '/app/mis-solicitudes'
      : '/app/solicitudes'
  return <Navigate to={destino} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/solicitar" element={<Solicitar />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/seguimiento/:token" element={<Seguimiento />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Portal interno */}
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<InicioPortal />} />
        <Route
          path="/app/solicitudes"
          element={
            <RequireRol roles={['ADMIN', 'COORDINADOR']}>
              <Bandeja />
            </RequireRol>
          }
        />
        <Route
          path="/app/solicitudes/:id"
          element={
            <RequireRol roles={['ADMIN', 'COORDINADOR']}>
              <Detalle />
            </RequireRol>
          }
        />

        {/* Agenda del técnico */}
        <Route
          path="/app/agenda"
          element={
            <RequireRol roles={['TECNICO']}>
              <MiAgenda />
            </RequireRol>
          }
        />

        {/* Portal del cliente */}
        <Route
          path="/app/mis-solicitudes"
          element={
            <RequireRol roles={['CLIENTE']}>
              <MisSolicitudes />
            </RequireRol>
          }
        />
        <Route
          path="/app/mis-solicitudes/nueva"
          element={
            <RequireRol roles={['CLIENTE']}>
              <NuevaSolicitud />
            </RequireRol>
          }
        />
        <Route
          path="/app/mis-solicitudes/:id"
          element={
            <RequireRol roles={['CLIENTE']}>
              <DetalleCliente />
            </RequireRol>
          }
        />

        {/* Dashboard operativo (internos y cliente filtrado) */}
        <Route
          path="/app/dashboard"
          element={
            <RequireRol roles={['ADMIN', 'COORDINADOR', 'CLIENTE']}>
              <Dashboard />
            </RequireRol>
          }
        />

        {/* Administración (solo ADMIN) */}
        <Route
          path="/app/organizaciones"
          element={
            <RequireRol roles={['ADMIN']}>
              <Organizaciones />
            </RequireRol>
          }
        />
        <Route
          path="/app/usuarios"
          element={
            <RequireRol roles={['ADMIN']}>
              <Usuarios />
            </RequireRol>
          }
        />
        <Route
          path="/app/tecnicos"
          element={
            <RequireRol roles={['ADMIN']}>
              <Tecnicos />
            </RequireRol>
          }
        />
        <Route
          path="/app/catalogos"
          element={
            <RequireRol roles={['ADMIN']}>
              <Catalogos />
            </RequireRol>
          }
        />

        <Route
          path="/app/*"
          element={
            <RequireRol roles={['ADMIN', 'COORDINADOR']}>
              <EnConstruccion titulo="El módulo" />
            </RequireRol>
          }
        />
      </Route>
    </Routes>
  )
}
