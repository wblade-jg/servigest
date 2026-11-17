import { Link } from 'react-router-dom'
import Hero from '../../components/Hero'

const lineas = [
  {
    nombre: 'Soporte técnico',
    descripcion:
      'Diagnóstico y resolución de incidencias de equipos, redes y sistemas.',
    modalidad: 'Por intervención o suscripción',
    imagen: '/servicio-soporte.png',
  },
  {
    nombre: 'Mantenimiento y prevención',
    descripcion:
      'Inspecciones y actividades planificadas para reducir fallos operativos.',
    modalidad: 'Principalmente suscripción',
    imagen: '/servicio-mantenimiento.png',
  },
  {
    nombre: 'Consultoría y optimización',
    descripcion:
      'Evaluación de infraestructura y procesos, con mejoras cotizadas por separado.',
    modalidad: 'Proyecto o acompañamiento',
    imagen: '/servicio-consultoria.png',
  },
]

const pasos = [
  {
    titulo: 'Envías tu requerimiento',
    texto: 'Describe la necesidad desde el formulario público; no hace falta registrarse.',
  },
  {
    titulo: 'Recibes un código de seguimiento',
    texto: 'La solicitud queda registrada y el equipo la revisa.',
  },
  {
    titulo: 'Revisamos y coordinamos',
    texto: 'Validamos la información y te contactamos para cotizar o pedir detalles.',
  },
  {
    titulo: 'Se ejecuta y se documenta',
    texto: 'Un técnico especializado realiza la intervención y registra el resultado.',
  },
]

export default function Inicio() {
  return (
    <>
      <Hero />

      <section className="mx-auto max-w-6xl px-6 py-20" aria-labelledby="servicios">
        <h2
          id="servicios"
          className="max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Tres líneas de servicio, una sola operación centralizada.
        </h2>
        <dl className="mt-12 grid gap-6 sm:grid-cols-3">
          {lineas.map((l) => (
            <div
              key={l.nombre}
              className="flex flex-col rounded-lg border border-tinta-900/15 bg-white overflow-hidden"
            >
              <div className="flex flex-1 flex-col bg-white">
                <img
                  src={l.imagen}
                  alt=""
                  className="h-48 w-full object-contain"
                />
              </div>
              <div className="flex flex-1 flex-col border-t border-tinta-900/10 bg-white p-6">
                <dt className="font-display text-lg font-bold">{l.nombre}</dt>
                <dd className="mt-2 flex-1 text-tinta-700">{l.descripcion}</dd>
                <dd className="mt-4 text-sm text-violeta-500">{l.modalidad}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-tinta-500">
          Las solicitudes se gestionan desde una sola plataforma: revisión,
          asignación por especialidad, intervenciones documentadas y estado en
          línea.
        </p>
      </section>

      <section className="bg-lavanda-honda" aria-labelledby="como-funciona">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2
            id="como-funciona"
            className="max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Cómo funciona sin suscripción.
          </h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {pasos.map((p, i) => (
              <li key={p.titulo}>
                <span className="font-display text-3xl font-bold text-violeta-500">
                  {i + 1}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-tinta-700">
                  {p.texto}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl text-sm text-tinta-500">
            Enviar el formulario no implica la aceptación automática del
            trabajo: toda prestación queda sujeta a evaluación, cotización y
            aceptación.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20" aria-labelledby="cta-final">
        <div className="border border-tinta-900/15 bg-white p-10 sm:p-14">
          <h2
            id="cta-final"
            className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Cuéntanos qué necesita tu empresa.
          </h2>
          <p className="mt-4 max-w-2xl text-tinta-700">
            Completa el formulario en pocos minutos. Recibirás un código para
            seguir el estado de tu solicitud en todo momento.
          </p>
          <Link
            to="/solicitar"
            className="mt-8 inline-block rounded-md bg-violeta-500 px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-violeta-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-500"
          >
            Crear una solicitud
          </Link>
        </div>
      </section>
    </>
  )
}
