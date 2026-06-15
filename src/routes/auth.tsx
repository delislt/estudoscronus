import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Cronus" },
      { name: "description", content: "Entre ou crie sua conta no Cronus e comece a estudar com IA: cronogramas, foco, flashcards e tutor." },
      { property: "og:title", content: "Entrar — Cronus" },
      { property: "og:description", content: "Acesse sua conta Cronus para estudar com IA." },
      { property: "og:url", content: "https://estudoscronus.lovable.app/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://estudoscronus.lovable.app/auth" }],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          // Auto sign-in (email confirmation disabled)
          toast.success("Conta criada! Vamos personalizar seus estudos.");
          navigate({ to: "/onboarding" });
        } else {
          // Email confirmation required
          toast.success(`Enviamos um link de confirmação para ${email}. Confira sua caixa de entrada (e o spam) para ativar a conta.`, { duration: 8000 });
          setMode("signin");
          setPassword("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/email.*not.*confirmed/i.test(error.message)) {
            toast.error("Confirme seu email antes de entrar. Verifique sua caixa de entrada.");
            return;
          }
          throw error;
        }
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Erro no login Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro no login Google");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app-gradient flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-lg">
          <span className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </span>
          Study
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-6 pb-16">
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/60 shadow-xl p-8">
          <h1 className="font-display font-extrabold text-3xl">
            {mode === "signin" ? "Bem-vindo de volta 👋" : "Vamos começar ✨"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Entre pra continuar seus estudos."
              : "Crie sua conta gratuita em segundos."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 w-full h-11 rounded-2xl border border-border bg-background hover:bg-muted transition flex items-center justify-center gap-3 font-medium text-sm disabled:opacity-50"
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" /> ou <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="email@exemplo.com"
              className="w-full h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              placeholder="Senha (mín. 6 caracteres)"
              className="w-full h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:brightness-105 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Vamos enviar um link de confirmação para o seu email antes de ativar a conta.
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signin" ? "Criar uma agora" : "Entrar"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A7.04 7.04 0 0 1 5.46 12c0-.72.14-1.43.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
