import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Pause, RotateCcw, SkipForward, Coffee, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { recordFocusSession } from "@/lib/focus.functions";

export const Route = createFileRoute("/_authenticated/foco")({
  head: () => ({ meta: [{ title: "Foco — Chronos" }] }),
  component: FocusPage,
});

type Phase = "focus" | "short" | "long";

function FocusPage() {
  const record = useServerFn(recordFocusSession);
  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [totalFocusMin, setTotalFocusMin] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSecs =
    phase === "focus" ? focusMin * 60 : phase === "short" ? shortMin * 60 : longMin * 60;

  useEffect(() => {
    if (!running) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          completePhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    // when phase changes via reset/skip, sync time
    setSecondsLeft(totalSecs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focusMin, shortMin, longMin]);

  async function completePhase() {
    setRunning(false);
    try {
      if (typeof Audio !== "undefined") {
        // simple beep via WebAudio (no asset)
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        o.start();
        o.stop(ctx.currentTime + 0.3);
      }
    } catch {
      /* ignore */
    }

    if (phase === "focus") {
      try {
        await record({ data: { duration_min: focusMin } });
        setTotalFocusMin((n) => n + focusMin);
        setCycles((n) => n + 1);
        toast.success(`+${focusMin} min de foco salvos!`);
      } catch (e) {
        toast.error("Erro ao salvar sessão");
      }
      const next: Phase = (cycles + 1) % 4 === 0 ? "long" : "short";
      setPhase(next);
    } else {
      setPhase("focus");
    }
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(totalSecs);
  }

  function skip() {
    completePhase();
  }

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const pct = totalSecs > 0 ? (1 - secondsLeft / totalSecs) * 100 : 0;

  const phaseLabel = phase === "focus" ? "Foco" : phase === "short" ? "Pausa curta" : "Pausa longa";
  const phaseIcon = phase === "focus" ? BookOpen : Coffee;
  const PhaseIcon = phaseIcon;

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Modo Foco</h1>
          <p className="text-sm text-muted-foreground">
            Pomodoro: blocos de foco intercalados com pausas.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm font-medium">
            <PhaseIcon className="h-4 w-4" />
            {phaseLabel}
          </div>

          <div className="relative my-8">
            <div className="text-6xl sm:text-7xl font-display font-extrabold tabular-nums">
              {mm}:{ss}
            </div>
            <div className="mt-6 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${
                  phase === "focus" ? "bg-primary" : "bg-emerald-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={reset}
              className="h-12 w-12 rounded-full bg-muted grid place-items-center hover:bg-muted/70"
              aria-label="Reiniciar"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className="h-14 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-lg shadow-primary/30 hover:brightness-105"
            >
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {running ? "Pausar" : "Começar"}
            </button>
            <button
              onClick={skip}
              className="h-12 w-12 rounded-full bg-muted grid place-items-center hover:bg-muted/70"
              aria-label="Pular"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>Ciclos hoje: <strong className="text-foreground">{cycles}</strong></span>
            <span>Foco: <strong className="text-foreground">{totalFocusMin} min</strong></span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Ajustes</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Foco (min)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={focusMin}
                onChange={(e) => setFocusMin(Math.max(1, Math.min(120, Number(e.target.value))))}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border/60"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Pausa curta</span>
              <input
                type="number"
                min={1}
                max={60}
                value={shortMin}
                onChange={(e) => setShortMin(Math.max(1, Math.min(60, Number(e.target.value))))}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border/60"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Pausa longa</span>
              <input
                type="number"
                min={1}
                max={60}
                value={longMin}
                onChange={(e) => setLongMin(Math.max(1, Math.min(60, Number(e.target.value))))}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border/60"
              />
            </label>
          </div>
        </div>
      </main>
    </div>
  );
}
