const planes = [
  {
    nombre: 'Soporte bajo demanda',
    descripcion: 'Atención de requerimientos puntuales sin compromiso de volumen. Ideal para pymes que inician su gestión tecnológica.',
    puntos: ['Requerimientos individuales', 'Seguimiento público con token', 'Horario de atención de oficina'],
  },
  {
    nombre: 'Gestión mensual',
    descripcion: 'Un canal continuo de asistencia con coordinación de prioridades y reporte de actividades.',
    puntos: ['Solicitudes ilimitadas dentro del mes', 'Priorización coordinada con SLA', 'Intervenciones documentadas'],
  },
  {
    nombre: 'Consultoría por proyecto',
    descripcion: 'Acompañamiento en proyectos de infraestructura: redes, servidores, seguridad y respaldos.',
    puntos: ['Alcance acordado por escrito', 'Ejecución por técnicos certificados', 'Cierre con resolución documentada'],
  },
]

export default function Planes() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Planes</h1>
      <p className="mt-4 max-w-2xl text-lg text-tinta-700">
        Modalidades de contratación informativas. La solicitud de asistencia se inicia desde el
        formulario público; no hay contratación en línea.
      </p>
      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {planes.map((p) => (
          <li key={p.nombre} className="rounded-lg border border-tinta-900/10 bg-white p-8">
            <h2 className="font-display text-xl font-bold">{p.nombre}</h2>
            <p className="mt-3 text-sm text-tinta-700">{p.descripcion}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {p.puntos.map((punto) => (
                <li key={punto} className="flex gap-2">
                  <span aria-hidden className="text-violeta-500">•</span>
                  {punto}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-12">
        <a
          href="/solicitar"
          className="inline-block rounded-md bg-violeta-500 px-6 py-3 font-display font-bold text-white transition-colors hover:bg-violeta-700"
        >
          Solicitar asistencia
        </a>
      </div>
    </section>
  )
}
