import { Route, Routes } from 'react-router-dom'
import Inicio from './app/pages/Inicio'
import Servicios from './app/pages/Servicios'
import Planes from './app/pages/Planes'
import Solicitar from './app/pages/Solicitar'
import Seguimiento from './app/pages/Seguimiento'
import Contacto from './app/pages/Contacto'
import PublicLayout from './app/layouts/PublicLayout'
import EnConstruccion from './app/pages/EnConstruccion'

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
        {/* El portal privado se implementa en la fase 2 */}
        <Route path="/login" element={<EnConstruccion titulo="Portal" />} />
      </Route>
    </Routes>
  )
}
