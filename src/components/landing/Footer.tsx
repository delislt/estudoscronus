export function Footer() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Chronos. Estudar pode ser leve.</p>
        <div className="flex gap-6">
          <a href="#recursos" className="hover:text-foreground">Recursos</a>
          <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          <a href="#ia-tutora" className="hover:text-foreground">IA tutora</a>
        </div>
      </div>
    </footer>
  );
}
