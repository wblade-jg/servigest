// Emisor SSE en memoria. Sin persistencia de notificaciones.
// El cliente reconecta y refetcha por REST para cubrir eventos perdidos.

const canales = new Map() // nombre -> Set<res>

function suscribir (canal, res) {
  if (!canales.has(canal)) canales.set(canal, new Set())
  canales.get(canal).add(res)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  })
  res.write(': conectado\n\n')
  const latido = setInterval(() => res.write(': latido\n\n'), 25000)
  const cerrar = () => {
    clearInterval(latido)
    canales.get(canal)?.delete(res)
  }
  res.on('close', cerrar)
  return cerrar
}

function emitir (canal, evento, datos) {
  const payload = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`
  for (const res of canales.get(canal) || []) {
    try { res.write(payload) } catch { /* cliente caído; la limpieza la hace req.on('close') */ }
  }
}

// Enlaza pruebas: permite esperar un evento sin abrir conexión SSE real.
const oyentes = new Map()
function enPrueba (evento, callback) {
  if (!oyentes.has(evento)) oyentes.set(evento, new Set())
  oyentes.get(evento).add(callback)
}

function notificarPrueba (evento, datos) {
  for (const cb of oyentes.get(evento) || []) {
    try { cb(datos) } catch { /* ignore */ }
  }
}

export { suscribir, emitir, enPrueba, notificarPrueba }
