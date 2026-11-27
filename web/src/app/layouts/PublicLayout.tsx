import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import SiteHeader from '../../components/SiteHeader'
import SiteFooter from '../../components/SiteFooter'

export default function PublicLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SiteHeader />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <SiteFooter />
    </Box>
  )
}
