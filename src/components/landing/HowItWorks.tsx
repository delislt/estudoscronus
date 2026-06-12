const steps = [
  { n: "01", title: "Crie sua conta", desc: "Em segundos, sem complicação." },
  { n: "02", title: "Responda o quiz", desc: "A gente entende como você estuda melhor." },
  { n: "03", title: "Receba sua rotina", desc: "Cronograma personalizado pronto pra usar." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl border border-border/60 bg-card p-8 relative overflow-hidden"
            >
              <span className="font-display font-extrabold text-6xl text-primary/30 leading-none">
                {s.n}
              </span>
              <h3 className="mt-4 font-display font-bold text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
