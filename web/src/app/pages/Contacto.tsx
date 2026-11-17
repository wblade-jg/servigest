export default function Contacto() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Contacto</h1>
      <p className="mt-4 text-lg text-tinta-700">
        Canales oficiales de ServiGest Ecuador.
      </p>
      <dl className="mt-10 space-y-6 text-sm">
        <div className="rounded-lg border border-tinta-900/10 bg-white p-6">
          <dt className="font-display font-bold">Ciudades</dt>
          <dd className="mt-2 text-tinta-700">Quito · Guayaquil</dd>
        </div>
        <div className="rounded-lg border border-tinta-900/10 bg-white p-6">
          <dt className="font-display font-bold">Horario de atención</dt>
          <dd className="mt-2 text-tinta-700">Lunes a viernes, 08:00–17:00 (America/Guayaquil)</dd>
        </div>
        <div className="rounded-lg border border-tinta-900/10 bg-white p-6">
          <dt className="font-display font-bold">Requerimientos técnicos</dt>
          <dd className="mt-2 text-tinta-700">
            Usa el formulario de <a href="/solicitar" className="text-violeta-500 underline">solicitud de asistencia</a>.
            Recibirás un código y un enlace de seguimiento inmediato.
          </dd>
        </div>
      </dl>
    </section>
  )
}
