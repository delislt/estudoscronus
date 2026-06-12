import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { generateSchedule } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Personalizar — Study" }] }),
  component: OnboardingPage,
});

const OBJECTIVES = [
  { value: "enem", label: "ENEM" },
  { value: "vestibular", label: "Vestibular" },
  { value: "concurso", label: "Concurso" },
  { value: "faculdade", label: "Faculdade" },
  { value: "idiomas", label: "Idiomas" },
  { value: "certificacao", label: "Certificação" },
];
const STYLES = [
  { value: "videos", label: "Videoaulas" },
  { value: "leitura", label: "Leitura e resumos" },
  { value: "exercicios", label: "Exercícios" },
  { value: "mixed", label: "Um pouco de tudo" },
];
const DAYS = [
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
  { v: 0, l: "Dom" },
];
const SUBJECT_PRESETS = [
  "Matemática", "Português", "Redação", "Física", "Química", "Biologia",
  "História", "Geografia", "Filosofia", "Sociologia", "Inglês",
];

type Subject = { name: string; difficulty: number };

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [objective, setObjective] = useState("enem");
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [style, setStyle] = useState("mixed");
  const [subjects, setSubjects] = useState<Subject[]>([
    { name: "Matemática", difficulty: 4 },
    { name: "Português", difficulty: 3 },
  ]);

  function toggleDay(d: number) {
    setStudyDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }
  function toggleSubject(name: string) {
    setSubjects((cur) =>
      cur.find((s) => s.name === name)
        ? cur.filter((s) => s.name !== name)
        : [...cur, { name, difficulty: 3 }],
    );
  }
  function setDifficulty(name: string, diff: number) {
    setSubjects((cur) => cur.map((s) => (s.name === name ? { ...s, difficulty: diff } : s)));
  }

  async function finish() {
    if (subjects.length === 0) {
      toast.error("Escolhe pelo menos uma matéria");
      return;
    }
    if (studyDays.length === 0) {
      toast.error("Escolhe pelo menos um dia da semana");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sem sessão");

      // Save onboarding
      const { error: onErr } = await supabase.from("onboarding").upsert({
        user_id: uid,
        objective,
        exam_date: examDate || null,
        hours_per_day: hoursPerDay,
        study_days: studyDays,
        learning_style: style,
      });
      if (onErr) throw onErr;

      // Clean previous subjects/tasks
      await supabase.from("schedule_tasks").delete().eq("user_id", uid);
      await supabase.from("subjects").delete().eq("user_id", uid);

      // Insert subjects
      const { data: insertedSubjects, error: subErr } = await supabase
        .from("subjects")
        .insert(subjects.map((s) => ({ user_id: uid, name: s.name, difficulty: s.difficulty })))
        .select("id, name, difficulty");
      if (subErr) throw subErr;

      // Generate 14-day schedule
      const tasks = generateSchedule({
        subjects: insertedSubjects ?? [],
        hoursPerDay,
        studyDays,
        days: 14,
      });
      if (tasks.length) {
        const { error: tErr } = await supabase
          .from("schedule_tasks")
          .insert(tasks.map((t) => ({ ...t, user_id: uid })));
        if (tErr) throw tErr;
      }

      // Default weekly goal
      await supabase.from("goals").insert({
        user_id: uid,
        title: `Estudar ${Math.round(hoursPerDay * studyDays.length)}h essa semana`,
        period: "weekly",
        target_value: Math.round(hoursPerDay * studyDays.length * 60),
        current_value: 0,
      });

      // Mark profile completed
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", uid);

      toast.success("Cronograma criado! Bora estudar 🚀");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const steps = ["Objetivo", "Tempo", "Matérias", "Estilo"];

  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-bold">
          <span className="h-8 w-8 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </span>
          Study
        </Link>
        <span className="text-xs text-muted-foreground">
          Passo {step + 1} de {steps.length}
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        <div className="rounded-3xl bg-card border border-border/60 shadow-xl p-8">
          <div className="flex gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-3xl">Qual seu objetivo?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A gente personaliza tudo a partir daqui.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setObjective(o.value)}
                    className={`rounded-2xl border p-4 text-left text-sm font-medium transition ${
                      objective === o.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Data da prova (opcional)</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="mt-2 w-full h-11 rounded-2xl border border-border bg-background px-4 text-sm"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-3xl">Quanto tempo por dia?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vamos respeitar sua rotina.
                </p>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">Horas por dia</label>
                  <span className="font-display font-bold text-2xl text-primary">
                    {hoursPerDay}h
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full mt-3 accent-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dias da semana</label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <button
                      key={d.v}
                      onClick={() => toggleDay(d.v)}
                      className={`h-10 px-4 rounded-full border text-sm font-medium transition ${
                        studyDays.includes(d.v)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-3xl">Suas matérias</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Toque pra escolher e ajuste a dificuldade (1 a 5).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_PRESETS.map((name) => {
                  const active = subjects.find((s) => s.name === name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleSubject(name)}
                      className={`h-10 px-4 rounded-full border text-sm font-medium transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Dificuldade
                  </p>
                  {subjects.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between rounded-2xl border border-border p-3"
                    >
                      <span className="text-sm font-medium">{s.name}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDifficulty(s.name, d)}
                            className={`h-8 w-8 rounded-lg text-xs font-bold ${
                              s.difficulty >= d
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-3xl">Como você aprende melhor?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A IA vai sugerir conteúdo no seu estilo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`rounded-2xl border p-4 text-left text-sm font-medium transition ${
                      style === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || loading}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 h-11 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-105"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 h-11 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-105 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar meu cronograma
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
