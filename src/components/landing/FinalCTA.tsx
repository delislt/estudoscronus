export function FinalCTA() {
  return (
    <section id="cta" className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="rounded-[2rem] bg-app-gradient border border-border/60 p-12 text-center shadow-sm">
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl">
            Pronta(o) pra começar?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Bora deixar os estudos mais leves a partir de hoje.
          </p>
          <a
            href="#top"
            className="mt-8 inline-flex items-center rounded-full bg-primary px-7 h-12 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-105 transition"
          >
            Criar minha conta grátis
          </a>
        </div>
      </div>
    </section>
  );
}
