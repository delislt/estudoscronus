import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, LogOut, Trophy, Video, Medal, Moon, Sun, LayoutDashboard, Calendar, Layers, Target, Timer, FileText, ClipboardCheck, PenLine, Brain, ShoppingBag, Users, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import chronosLogo from "@/assets/chronos-emblem.png.asset.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Itens principais ficam sempre visíveis; o restante vai para o menu "Mais".
const primaryItems = [
  { to: "/dashboard",  label: "Painel",      icon: LayoutDashboard },
  { to: "/tutor",      label: "Tutora",      icon: Bot },
  { to: "/flashcards", label: "Flashcards",  icon: Layers },
  { to: "/simulados",  label: "Simulados",   icon: ClipboardCheck },
  { to: "/redacao",    label: "Redação",     icon: PenLine },
  { to: "/foco",       label: "Foco",        icon: Timer },
] as const;

const moreItems = [
  { to: "/calendario", label: "Calendário",  icon: Calendar },
  { to: "/resumos",    label: "Resumos",     icon: FileText },
  { to: "/revisar",    label: "Revisar",     icon: Brain },
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
          <img src={chronosLogo.url} alt="Cronus — Estudos leves com IA" className="h-9 w-9 object-contain" />
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1 justify-center">
          {primaryItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="px-2.5 sm:px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 shrink-0"
              activeProps={{ className: "px-2.5 sm:px-3 py-2 rounded-full text-sm font-medium bg-muted text-foreground inline-flex items-center gap-1.5 shrink-0" }}
            >
              <it.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{it.label}</span>
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className="px-2.5 sm:px-3 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Mais opções"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden lg:inline">Mais</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {moreItems.map((it) => (
                <DropdownMenuItem key={it.to} asChild>
                  <Link to={it.to} className="flex items-center gap-2 cursor-pointer">
                    <it.icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
