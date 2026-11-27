import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import MenuOutlined from '@mui/icons-material/MenuOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import BusinessOutlined from '@mui/icons-material/BusinessOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import HandymanOutlined from '@mui/icons-material/HandymanOutlined'
import CategoryOutlined from '@mui/icons-material/CategoryOutlined'
import { useAuth, esInterno } from '../../lib/auth'
import { ETIQUETAS_ROL } from '../../lib/admin'
import { Boton } from '../../components/ui/primitivos'
import { archivo, tinta } from '../../theme'

// Layout del portal interno: rail de navegación persistente en escritorio y
// cajón temporal en móvil. La identidad oscura del rail separa operación de
// contenido sin recurrir a sombras.

const ANCHO_RAIL = 264

interface Enlace {
  to: string
  texto: string
  icono: ReactNode
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth()
  const [movilAbierto, setMovilAbierto] = useState(false)

  const interno = esInterno(usuario)
  const admin = usuario?.rol === 'ADMIN'

  const enlaces: Enlace[] = [
    ...(usuario?.rol === 'TECNICO'
      ? [{ to: '/app/agenda', texto: 'Mi agenda', icono: <CalendarMonthOutlined fontSize="small" /> }]
      : []),
    ...(usuario?.rol === 'CLIENTE'
      ? [
          { to: '/app/mis-solicitudes', texto: 'Mis solicitudes', icono: <AssignmentOutlined fontSize="small" /> },
          { to: '/app/dashboard', texto: 'Dashboard', icono: <DashboardOutlined fontSize="small" /> },
        ]
      : []),
    ...(interno
      ? [
          { to: '/app/solicitudes', texto: 'Solicitudes', icono: <AssignmentOutlined fontSize="small" /> },
          { to: '/app/dashboard', texto: 'Dashboard', icono: <DashboardOutlined fontSize="small" /> },
        ]
      : []),
    ...(admin
      ? [
          { to: '/app/organizaciones', texto: 'Organizaciones', icono: <BusinessOutlined fontSize="small" /> },
          { to: '/app/usuarios', texto: 'Usuarios', icono: <PeopleOutlined fontSize="small" /> },
          { to: '/app/tecnicos', texto: 'Técnicos', icono: <HandymanOutlined fontSize="small" /> },
          { to: '/app/catalogos', texto: 'Catálogos', icono: <CategoryOutlined fontSize="small" /> },
        ]
      : []),
  ]

  const contenido = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: tinta[900], color: 'common.white' }}>
      <Stack
        component={Link}
        to="/app"
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', px: 2.5, py: 2.5, color: 'inherit', textDecoration: 'none' }}
      >
        <Box
          component="img"
          src="/servigest-logo.png"
          alt=""
          sx={{ height: 30, width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
        <Typography sx={{ fontFamily: archivo, fontWeight: 700, letterSpacing: '-0.01em' }}>ServiGest</Typography>
      </Stack>

      <List component="nav" aria-label="Portal" sx={{ px: 1.5, flex: 1, overflowY: 'auto' }}>
        {enlaces.map((enlace) => (
          <ListItemButton
            key={enlace.to}
            component={NavLink}
            to={enlace.to}
            onClick={() => setMovilAbierto(false)}
            sx={{
              mb: 0.5,
              color: 'rgba(255,255,255,0.72)',
              '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 34 },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: 'common.white' },
              '&.active': { bgcolor: 'primary.main', color: 'common.white' },
            }}
          >
            <ListItemIcon>{enlace.icono}</ListItemIcon>
            <ListItemText
              primary={enlace.texto}
              slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.12)' }}>
        <Typography sx={{ fontFamily: archivo, fontWeight: 700, fontSize: 14 }} noWrap>
          {usuario?.nombre}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          {ETIQUETAS_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
        </Typography>
        <Boton
          variante="fantasma"
          fullWidth
          startIcon={<LogoutOutlined fontSize="small" />}
          onClick={() => void logout()}
          sx={{ mt: 1, justifyContent: 'flex-start', color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'common.white' } }}
        >
          Cerrar sesión
        </Boton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: ANCHO_RAIL,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: ANCHO_RAIL, boxSizing: 'border-box', borderRight: 0 },
        }}
      >
        {contenido}
      </Drawer>

      <Drawer
        variant="temporary"
        open={movilAbierto}
        onClose={() => setMovilAbierto(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: ANCHO_RAIL, boxSizing: 'border-box', borderRight: 0 },
        }}
      >
        {contenido}
      </Drawer>

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          sx={{
            display: { lg: 'none' },
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: 60 }}>
            <IconButton edge="start" aria-label="Abrir menú" onClick={() => setMovilAbierto(true)}>
              <MenuOutlined />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontFamily: archivo, fontWeight: 700, fontSize: 14 }}>
                {usuario?.nombre}
              </Typography>
              <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                {ETIQUETAS_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
              </Typography>
            </Box>
            <Boton variante="secundario" size="small" onClick={() => void logout()}>
              Salir
            </Boton>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, minWidth: 0, bgcolor: 'background.default' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
