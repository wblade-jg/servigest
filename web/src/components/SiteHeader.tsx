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
  Typography,
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
        bgcolor: 'rgba(252,251,248,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
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
              color: tinta[950],
              textDecoration: 'none',
            }}
          >
            <Box
              component="img"
              src="/servigest-logo.png"
              alt=""
              sx={{ height: { xs: 34, sm: 38 }, width: 'auto' }}
            />
            <Box>
              <Typography
                component="span"
                sx={{
                  display: 'block',
                  fontFamily: archivo,
                  fontSize: { xs: 15, sm: 16 },
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                ServiGest
              </Typography>
              <Typography
                component="span"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  color: 'text.secondary',
                  fontFamily: archivo,
                  fontSize: 9,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '0.08em',
                }}
              >
                ECUADOR
              </Typography>
            </Box>
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
                    color: activo ? 'primary.main' : 'text.secondary',
                    bgcolor: activo ? 'action.hover' : 'transparent',
                    '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
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
              borderColor: 'divider',
            }}
          >
            <Button component={Link} to="/login" variant="text" color="secondary" sx={{ minWidth: 0, px: 1 }}>
              Portal
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
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: tinta[900] }}
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
            <Typography sx={{ fontFamily: archivo, fontWeight: 800, letterSpacing: '-0.02em' }}>
              ServiGest
            </Typography>
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
