export default function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        {titulo}
      </h1>
      <p className="mt-4 text-lg text-tinta-700">
        Esta sección se implementa en los siguientes módulos del P0.
      </p>
    </section>
  )
}
