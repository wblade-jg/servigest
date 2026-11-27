// Tema de ServiGest: MUI como motor de componentes, identidad propia.
// La dirección visual es "expediente técnico": tinta, papel, reglas de 1 px
// y un único acento violeta para acción y selección.

import { alpha, createTheme } from '@mui/material/styles'

export const archivo = '"Archivo Variable", "Archivo", ui-sans-serif, system-ui, sans-serif'
export const serif = '"Source Serif 4 Variable", "Source Serif 4", ui-serif, Georgia, serif'

export const tinta = {
  950: '#0F1324',
  900: '#141A2E',
  700: '#2C3554',
  500: '#5B6584',
}

export const lavanda = '#F3F4FB'
export const lavandaHonda = '#E7E9F6'
export const papel = '#FCFBF8'
export const violeta = {
  400: '#7A58F5',
  500: '#5B34F0',
  700: '#3F1FB5',
}

const borde = alpha(tinta[950], 0.12)
const bordeFuerte = alpha(tinta[950], 0.22)

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: violeta[500],
      light: violeta[400],
      dark: violeta[700],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: tinta[700],
      light: tinta[500],
      dark: tinta[950],
      contrastText: '#FFFFFF',
    },
    background: {
      default: lavanda,
      paper: papel,
    },
    text: {
      primary: tinta[950],
      secondary: tinta[500],
    },
    divider: borde,
    success: { main: '#0E7C66', light: '#E3F3EF', dark: '#095B4B', contrastText: '#FFFFFF' },
    warning: { main: '#A86400', light: '#FDF0DB', dark: '#7A4800', contrastText: '#FFFFFF' },
    error: { main: '#B3261E', light: '#FBE7E5', dark: '#7C1A14', contrastText: '#FFFFFF' },
    info: { main: '#2F5DA8', light: '#E6EEF9', dark: '#1F3F73', contrastText: '#FFFFFF' },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: serif,
    h1: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
      lineHeight: 1.04,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
      lineHeight: 1.1,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.25,
    },
    h5: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: '1.0625rem',
      lineHeight: 1.3,
    },
    h6: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: '0.9375rem',
      lineHeight: 1.35,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.65,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontFamily: archivo,
      fontWeight: 600,
      fontSize: '0.75rem',
      letterSpacing: '0.01em',
      textTransform: 'none',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: archivo,
      fontWeight: 700,
      fontSize: '0.875rem',
      textTransform: 'none',
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: lavanda,
          color: tinta[950],
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': {
          backgroundColor: alpha(violeta[500], 0.18),
        },
        ':focus-visible': {
          outline: `2px solid ${violeta[500]}`,
          outlineOffset: 2,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
          minHeight: 38,
          paddingInline: 16,
          fontWeight: 700,
        },
        sizeSmall: {
          minHeight: 32,
          paddingInline: 12,
        },
        contained: {
          '&:hover': { backgroundColor: violeta[700] },
        },
        outlined: {
          borderColor: bordeFuerte,
          '&:hover': { borderColor: violeta[500], backgroundColor: alpha(violeta[500], 0.04) },
        },
        text: {
          paddingInline: 8,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderColor: borde,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: `1px solid ${borde}`,
        },
      },
    },
    MuiTable: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: borde,
          fontSize: '0.875rem',
          paddingBlock: 10,
        },
        head: {
          fontFamily: archivo,
          fontWeight: 700,
          fontSize: '0.75rem',
          color: tinta[500],
          letterSpacing: 0,
          borderBottomColor: borde,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(violeta[500], 0.035),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontFamily: archivo,
          fontWeight: 700,
          fontSize: '0.75rem',
          height: 24,
        },
        label: {
          paddingInline: 8,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontFamily: archivo,
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: tinta[700],
          marginBottom: 4,
          '&.Mui-focused': { color: violeta[500] },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginTop: 4,
          fontSize: '0.75rem',
          color: tinta[500],
        },
      },
    },
    MuiLink: {
      defaultProps: {
        underline: 'hover',
      },
      styleOverrides: {
        root: {
          color: violeta[500],
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: archivo,
          fontWeight: 700,
          textTransform: 'none',
          minHeight: 40,
          paddingInline: 12,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 999,
          backgroundColor: lavandaHonda,
        },
        bar: {
          borderRadius: 999,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          backgroundColor: alpha(tinta[950], 0.08),
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          alignItems: 'center',
        },
      },
    },
    MuiAlertTitle: {
      styleOverrides: {
        root: {
          fontFamily: archivo,
          fontWeight: 700,
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          backgroundColor: tinta[900],
          fontFamily: archivo,
          fontSize: '0.75rem',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontFamily: archivo,
          fontWeight: 600,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: borde,
        },
      },
    },
  },
})

export default theme
