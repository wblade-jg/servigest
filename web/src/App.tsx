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
import Organizaciones from './app/pages/admin/Organizaciones'
import Usuarios from './app/pages/admin/Usuarios'
import Tecnicos from './app/pages/admin/Tecnicos'
import Catalogos from './app/pages/admin/Catalogos'
import { RequireAuth, RequireRol } from './app/layouts/PortalGuardas'

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
        <Route path="/app" element={<Navigate to="/app/solicitudes" replace />} />
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
