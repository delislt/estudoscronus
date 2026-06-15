import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, LogOut, Trophy, Video, Medal, Moon, Sun, LayoutDashboard, Calendar, Layers, Target, Timer, FileText, ClipboardCheck, PenLine, Brain, ShoppingBag, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import chronosLogo from "@/assets/chronos-emblem.png.asset.json";

const navItems = [
  { to: "/dashboard",  label: "Painel",      icon: LayoutDashboard },
  { to: "/calendario", label: "Calendário",  icon: Calendar },
  { to: "/tutor",      label: "Tutora",      icon: Bot },
  { to: "/flashcards", label: "Flashcards",  icon: Layers },
  { to: "/resumos",    label: "Resumos",     icon: FileText },
  { to: "/simulados",  label: "Simulados",   icon: ClipboardCheck },
  { to: "/redacao",    label: "Redação",     icon: PenLine },
  { to: "/revisar",    label: "Revisar",     icon: Brain },
  { to: "/foco",       label: "Foco",        icon: Timer },
  { to: "/metas",      label: "Metas",       icon: Target },
  { to: "/amigos",     label: "Amigos",      icon: Users },
  { to: "/loja",       label: "Loja",        icon: ShoppingBag },
  { to: "/videoaulas", label: "Videoaulas",  icon: Video },
  { to: "/conquistas", label: "Conquistas",  icon: Trophy },
  { to: "/ranking",    label: "Ranking",     icon: Medal },
] as const;

export function AppHeader() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <header className="border-b border-border/40 bg-background/70 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/dashboard" className="inline-flex items-center gap-2 font-display font-bold shrink-0">
          <img src={chronosLogo.url} alt="Chronos" className="h-9 w-9 object-contain" />
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="px-2.5 sm:px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 shrink-0"
              activeProps={{ className: "px-2.5 sm:px-3 py-2 rounded-full text-sm font-medium bg-muted text-foreground inline-flex items-center gap-1.5 shrink-0" }}
            >
              <it.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{it.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
