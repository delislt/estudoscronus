import { Link } from "@tanstack/react-router";
import chronosLogo from "@/assets/chronos-emblem.png.asset.json";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <img src={chronosLogo.url} alt="Chronos" className="h-9 w-9 object-contain" />
          <span className="font-display font-bold text-lg">Chronos</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#recursos" className="hover:text-foreground transition">Recursos</a>
          <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
          <a href="#ia-tutora" className="hover:text-foreground transition">IA tutora</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 transition"
          >
            Começar
          </Link>
        </div>
      </div>
    </header>
  );
}
