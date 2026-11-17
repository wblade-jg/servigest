'use strict'

// Detección de MIME real por magic bytes.
// MIME permitidos en P0: image/jpeg, image/png, application/pdf.

const MAGIAS = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] } // %PDF
]

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const TAMANO_MAX = 5 * 1024 * 1024
const MAX_ADJUNTOS = 5

function detectarMime (buffer) {
  for (const magia of MAGIAS) {
    if (magia.bytes.every((byte, i) => buffer[i] === byte)) return magia.mime
  }
  return null
}

function sanitizarNombre (nombre) {
  return String(nombre || 'archivo').replace(/[\r\n]/g, '').slice(0, 255)
}

function extensionDe (mime) {
  return mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : '.pdf'
}

module.exports = { detectarMime, MIME_PERMITIDOS, TAMANO_MAX, MAX_ADJUNTOS, sanitizarNombre, extensionDe }
