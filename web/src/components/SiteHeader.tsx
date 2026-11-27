import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
} from '@mui/material'
import MenuOutlined from '@mui/icons-material/MenuOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import ArrowOutwardOutlined from '@mui/icons-material/ArrowOutwardOutlined'
import { archivo, tinta } from '../theme'

const enlaces = [
  { to: '/servicios', texto: 'Servicios' },
  { to: '/planes', texto: 'Planes' },
  { to: '/contacto', texto: 'Contacto' },
]

export default function SiteHeader() {
  const [movilAbierto, setMovilAbierto] = useState(false)
  const ubicacion = useLocation()

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{
        bgcolor: tinta[900],
        borderBottom: '1px solid',
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 68, lg: 76 }, gap: 2 }}>
          <Box
            component={Link}
            to="/"
            aria-label="ServiGest Ecuador — inicio"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              mr: 'auto',
              color: 'common.white',
              textDecoration: 'none',
            }}
          >
            <Box
              component="img"
              src="/servigest-logo.png"
              alt="ServiGest Ecuador"
              sx={{
                height: { xs: 34, sm: 38 },
                width: 'auto',
                filter: 'brightness(0) invert(1)',
              }}
            />
          </Box>

          <Box
            component="nav"
            aria-label="Navegación principal"
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {enlaces.map((e) => {
              const activo = ubicacion.pathname === e.to
              return (
                <Button
                  key={e.to}
                  component={NavLink}
                  to={e.to}
                  sx={{
                    px: 1.5,
                    minHeight: 40,
                    color: activo ? 'common.white' : 'rgba(255,255,255,0.72)',
                    bgcolor: activo ? 'rgba(255,255,255,0.10)' : 'transparent',
                    '&:hover': { color: 'common.white', bgcolor: 'rgba(255,255,255,0.10)' },
                  }}
                >
                  {e.texto}
                </Button>
              )
            })}
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              pl: 2,
              ml: 0.5,
              borderLeft: '1px solid',
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              sx={{
                minWidth: 0,
                px: 1.5,
                color: 'common.white',
                borderColor: 'rgba(255,255,255,0.48)',
                '&:hover': {
                  borderColor: 'common.white',
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              Ingresar al portal
            </Button>
            <Button
              component={Link}
              to="/solicitar"
              variant="contained"
              endIcon={<ArrowOutwardOutlined sx={{ fontSize: 18 }} />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Nueva solicitud
            </Button>
          </Box>

          <IconButton
            aria-label="Abrir menú"
            onClick={() => setMovilAbierto(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'common.white' }}
          >
            <MenuOutlined />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer
        anchor="right"
        open={movilAbierto}
        onClose={() => setMovilAbierto(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: { width: 'min(88vw, 320px)', bgcolor: 'background.paper' } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box
              component="img"
              src="/servigest-logo.png"
              alt="ServiGest Ecuador"
              sx={{
                height: 34,
                width: 'auto',
                filter: 'brightness(0) invert(1)',
              }}
            />
            <IconButton aria-label="Cerrar menú" onClick={() => setMovilAbierto(false)}>
              <CloseOutlined />
            </IconButton>
          </Stack>

          <List sx={{ px: 1.5, py: 2 }}>
            {enlaces.map((e) => (
              <ListItemButton
                key={e.to}
                component={NavLink}
                to={e.to}
                onClick={() => setMovilAbierto(false)}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  '&.active': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <ListItemText
                  primary={e.texto}
                  slotProps={{ primary: { sx: { fontFamily: archivo, fontWeight: 700 } } }}
                />
              </ListItemButton>
            ))}
          </List>

          <Stack spacing={1} sx={{ mt: 'auto', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button component={Link} to="/solicitar" variant="contained" endIcon={<ArrowOutwardOutlined />} onClick={() => setMovilAbierto(false)}>
              Nueva solicitud
            </Button>
            <Button component={Link} to="/login" variant="outlined" onClick={() => setMovilAbierto(false)}>
              Ingresar al portal
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </AppBar>
  )
}
