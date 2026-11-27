import { Typography } from '@mui/material'
import { Pagina } from '../../components/ui/primitivos'

export default function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <Pagina maxWidth="md">
      <Typography variant="h1">{titulo}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Esta sección se implementa en los siguientes módulos del P0.
      </Typography>
    </Pagina>
  )
}
