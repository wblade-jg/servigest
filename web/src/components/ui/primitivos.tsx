// Primitivos de UI compartidos del portal. Envoltorios finos sobre MUI para
// conservar la API que ya usan las vistas y concentrar la identidad visual.

import { cloneElement, isValidElement, useId } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { alpha, styled } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { archivo, lavandaHonda, tinta } from '../../theme'

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma'

const VARIANTES: Record<VarianteBoton, { variant: 'contained' | 'outlined' | 'text'; color: 'primary' | 'secondary' | 'error' | 'inherit' }> = {
  primario: { variant: 'contained', color: 'primary' },
  secundario: { variant: 'outlined', color: 'secondary' },
  peligro: { variant: 'contained', color: 'error' },
  fantasma: { variant: 'text', color: 'inherit' },
}

export function Boton({
  variante = 'primario',
  sx,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  variante?: VarianteBoton
  component?: React.ElementType
  to?: string
  href?: string
  fullWidth?: boolean
  size?: 'small' | 'medium' | 'large'
  startIcon?: ReactNode
  endIcon?: ReactNode
  sx?: SxProps<Theme>
}) {
  const config = VARIANTES[variante]
  const sxFantasma = {
    color: 'text.secondary',
    '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
  }

  return (
    <Button
      {...props}
      variant={config.variant}
      color={config.color}
      sx={variante === 'fantasma' ? ([sxFantasma, sx] as SxProps<Theme>) : sx}
    >
      {children}
    </Button>
  )
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  const id = useId()
  const ayudaId = `${id}-ayuda`
  const hijo = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
        id,
        'aria-describedby': ayuda ? ayudaId : undefined,
      })
    : children

  return (
    <FormControl fullWidth margin="none">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      {hijo}
      {ayuda ? <FormHelperText id={ayudaId}>{ayuda}</FormHelperText> : null}
    </FormControl>
  )
}

const BASE_CONTROL = ({ theme }: { theme: Theme }) => ({
  boxSizing: 'border-box' as const,
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.text.primary, 0.18)}`,
  borderRadius: theme.shape.borderRadius,
  padding: '8px 12px',
  fontFamily: theme.typography.body2.fontFamily,
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: theme.palette.text.primary,
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  '&::placeholder': { color: alpha(theme.palette.text.secondary, 0.7) },
  '&:hover': { borderColor: alpha(theme.palette.text.primary, 0.32) },
  '&:focus-visible': {
    outline: 'none',
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  },
  '&:disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    cursor: 'not-allowed',
  },
})

const ControlBase = styled('input')(BASE_CONTROL)

const AreaBase = styled('textarea')(({ theme }) => ({
  ...BASE_CONTROL({ theme }),
  minHeight: 96,
  resize: 'vertical',
}))

const SelectBase = styled('select')(({ theme }) => ({
  ...BASE_CONTROL({ theme }),
  appearance: 'none',
  paddingRight: 32,
  cursor: 'pointer',
  backgroundImage: 'none',
}))

export function Entrada({ sx, ...props }: InputHTMLAttributes<HTMLInputElement> & { sx?: SxProps<Theme> }) {
  return <ControlBase {...props} sx={sx} />
}

export function AreaTexto({ sx, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { sx?: SxProps<Theme> }) {
  return <AreaBase {...props} sx={sx} />
}

export function Selector({ sx, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { sx?: SxProps<Theme> }) {
  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <SelectBase {...props} sx={sx}>
        {children}
      </SelectBase>
      <ExpandMoreIcon
        sx={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 18,
          color: 'text.secondary',
          pointerEvents: 'none',
        }}
      />
    </Box>
  )
}

const COLORES_ESTADO: Record<string, { bg: string; fg: string }> = {
  RECIBIDA: { bg: lavandaHonda, fg: tinta[700] },
  EN_REVISION: { bg: '#FDF0DB', fg: '#7A4800' },
  REQUIERE_INFORMACION: { bg: '#FCE9DA', fg: '#8A3B00' },
  APROBADA: { bg: '#E3F3EF', fg: '#095B4B' },
  RECHAZADA: { bg: '#FBE7E5', fg: '#7C1A14' },
  ASIGNADA: { bg: '#E6EEF9', fg: '#1F3F73' },
  EN_PROCESO: { bg: '#E9E4FE', fg: '#3F1FB5' },
  RESUELTA: { bg: '#DDEFEA', fg: '#0B5F50' },
  CERRADA: { bg: alpha(tinta[950], 0.08), fg: tinta[700] },
  CANCELADA: { bg: '#FBE7E5', fg: '#7C1A14' },
}

export function BadgeEstado({ estado, texto }: { estado: string; texto: string }) {
  const tono = COLORES_ESTADO[estado] ?? { bg: lavandaHonda, fg: tinta[700] }
  return <Chip size="small" label={texto} sx={{ bgcolor: tono.bg, color: tono.fg }} />
}

export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
}: {
  titulo: string
  abierto: boolean
  onCerrar: () => void
  children: ReactNode
}) {
  const tituloId = useId()

  return (
    <Dialog open={abierto} onClose={onCerrar} fullWidth maxWidth="sm" aria-labelledby={tituloId}>
      <DialogTitle id={tituloId} sx={{ position: 'relative', pr: 6, fontFamily: archivo, fontWeight: 700 }}>
        {titulo}
        <IconButton aria-label="Cerrar" onClick={onCerrar} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
    </Dialog>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <Stack direction="row" spacing={1.5} role="status" aria-live="polite" sx={{ alignItems: 'center', color: 'text.secondary', py: 2 }}>
      <CircularProgress size={18} thickness={5} />
      <Typography variant="body2">{texto}</Typography>
    </Stack>
  )
}

export function ErrorPanel({ mensaje }: { mensaje: string }) {
  return <Alert severity="error">{mensaje}</Alert>
}

export function Pagina({
  children,
  maxWidth = 'lg',
  sx,
}: {
  children: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  sx?: SxProps<Theme>
}) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: { xs: 4, md: 6 }, ...sx }}>
      {children}
    </Container>
  )
}

export function Tarjeta({
  titulo,
  acciones,
  children,
  sx,
}: {
  titulo?: string
  acciones?: ReactNode
  children: ReactNode
  sx?: SxProps<Theme>
}) {
  return (
    <Card variant="outlined" sx={{ bgcolor: 'background.paper', ...sx }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        {(titulo || acciones) && (
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            {titulo ? <Typography variant="h5">{titulo}</Typography> : <span />}
            {acciones}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

export function Dato({ titulo, valor }: { titulo: string; valor: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" component="dt" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}>
        {titulo}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, mt: 0.25, color: 'text.primary' }}>
        {valor}
      </Typography>
    </Box>
  )
}

export function EstadoVacio({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <Box
      sx={{
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
      {accion && <Box sx={{ mt: 2 }}>{accion}</Box>}
    </Box>
  )
}
