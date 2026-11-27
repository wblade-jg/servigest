import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
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
import { tinta } from '../theme'

const enlaces = [
  { to: '/servicios', texto: 'Servicios' },
  { to: '/planes', texto: 'Planes' },
  { to: '/contacto', texto: 'Contacto' },
]

export default function SiteHeader() {
  const [movilAbierto, setMovilAbierto] = useState(false)

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 72 }, gap: 2 }}>
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', mr: 'auto' }}>
            <Box component="img" src="/servigest-logo.png" alt="ServiGest" sx={{ height: 40, width: 'auto' }} />
            <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              ServiGest Ecuador — inicio
            </Box>
          </Box>

          <Stack component="nav" aria-label="Navegación principal" direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {enlaces.map((e) => (
              <Button
                key={e.to}
                component={NavLink}
                to={e.to}
                color="inherit"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  px: 0,
                  minHeight: 'auto',
                  '&:hover': { color: 'primary.main', backgroundColor: 'transparent' },
                  '&.active': { color: 'primary.main' },
                }}
              >
                {e.texto}
              </Button>
            ))}
            <Button component={Link} to="/login" variant="outlined" color="primary">
              Ingresar al portal
            </Button>
          </Stack>

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
        slotProps={{ paper: { sx: { width: 280, bgcolor: 'background.paper' } } }}
      >
        <Stack direction="row" sx={{ justifyContent: 'flex-end', p: 1 }}>
          <IconButton aria-label="Cerrar menú" onClick={() => setMovilAbierto(false)}>
            <CloseOutlined />
          </IconButton>
        </Stack>
        <List sx={{ px: 2 }}>
          {enlaces.map((e) => (
            <ListItemButton
              key={e.to}
              component={NavLink}
              to={e.to}
              onClick={() => setMovilAbierto(false)}
              sx={{ '&.active': { color: 'primary.main', bgcolor: 'action.hover' } }}
            >
              <ListItemText primary={e.texto} />
            </ListItemButton>
          ))}
          <ListItemButton component={Link} to="/login" onClick={() => setMovilAbierto(false)} sx={{ mt: 1 }}>
            <ListItemText primary="Ingresar al portal" slotProps={{ primary: { sx: { color: 'primary.main', fontWeight: 700 } } }} />
          </ListItemButton>
        </List>
      </Drawer>
    </AppBar>
  )
}
