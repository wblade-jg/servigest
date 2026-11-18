'use strict'

const repositorio = require('./repository')

// Reglas del dashboard: Admin y Coordinador ven métricas globales; el Cliente
// solo las de su organización y nunca la carga por técnico.

function esInterno (usuario) {
  return usuario.rol === 'ADMIN' || usuario.rol === 'COORDINADOR'
}

async function obtener (usuario) {
  const organizacionId = esInterno(usuario) ? null : usuario.organizacionId

  const [porEstado, porPrioridad, sla, mttrHoras, total, cargaTecnicos] = await Promise.all([
    repositorio.porEstado(organizacionId),
    repositorio.porPrioridad(organizacionId),
    repositorio.resumenSla(organizacionId),
    repositorio.mttrHoras(organizacionId),
    repositorio.total(organizacionId),
    esInterno(usuario) ? repositorio.cargaPorTecnico(organizacionId) : Promise.resolve(null)
  ])

  return {
    total,
    porEstado,
    porPrioridad,
    sla,
    mttrHoras,
    cargaTecnicos
  }
}

module.exports = { obtener }
