import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { answerQuestion, finishAttempt, getAttempt } from "@/lib/simulados.functions";

export const Route = createFileRoute("/_authenticated/simulados/$attemptId")({
  head: () => ({ meta: [{ title: "Simulado em andamento — Chronos" }] }),
  component: TakeExam,
});

type Question = {
  id: string;
  subject: string;
  topic: string | null;
  statement: string;
  alternatives: Array<{ label: string; text: string }>;
  exam_year: number | null;
};

function TakeExam() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const fetchAttempt = useServerFn(getAttempt);
  const answerFn = useServerFn(answerQuestion);
  const finishFn = useServerFn(finishAttempt);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  useEffect(() => {
    fetchAttempt({ data: { attemptId } })
      .then((res) => {
        const r = res as unknown as { questions: Question[]; answers: { question_id: string; chosen_label: string | null }[]; attempt: { status: string } };
        if (r.attempt.status === "finished") {
          navigate({ to: "/simulados/$attemptId/resultado", params: { attemptId } });
          return;
        }
        if (!r.questions || r.questions.length === 0) {
          toast.error("Esse simulado não tem questões. Crie um novo.");
          navigate({ to: "/simulados" });
          return;
        }
        setQuestions(r.questions);
        const map: Record<string, string> = {};
        for (const a of r.answers) if (a.chosen_label) map[a.question_id] = a.chosen_label;
        setAnswers(map);
        setLoading(false);
        setStartedAt(Date.now());
      })
      .catch((e) => {
        toast.error((e as Error).message || "Falha ao carregar simulado");
        navigate({ to: "/simulados" });
      });
  }, [attemptId, fetchAttempt, navigate]);

  const current = questions[index];

  async function choose(label: string) {
    if (!current) return;
    setAnswers((a) => ({ ...a, [current.id]: label }));
    const timeMs = Date.now() - startedAt;
    setStartedAt(Date.now());
    try {
      await answerFn({ data: { attemptId, questionId: current.id, chosenLabel: label, timeMs } });
    } catch (e) {
      toast.error("Falha ao salvar resposta");
    }
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await finishFn({ data: { attemptId } });
      navigate({ to: "/simulados/$attemptId/resultado", params: { attemptId } });
    } catch (e) {
      toast.error((e as Error).message);
      setFinishing(false);
    }
  }

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          Carregando questões...
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Questão {index + 1} de {questions.length} · <span className="text-foreground">{current.subject}</span>
            {current.exam_year ? ` · ENEM ${current.exam_year}` : null}
          </p>
          <p className="text-sm text-muted-foreground">{answeredCount}/{questions.length} respondidas</p>
        </div>

        <article className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
            {current.statement}
          </div>

          <div className="space-y-2">
            {current.alternatives.map((alt) => {
              const selected = answers[current.id] === alt.label;
              return (
                <button
                  key={alt.label}
                  onClick={() => choose(alt.label)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
                  }`}
                >
                  <span className="font-semibold mr-2">{alt.label}.</span>
                  <span>{alt.text}</span>
                </button>
              );
            })}
          </div>
        </article>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>

          {index < questions.length - 1 ? (
            <button
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Finalizar
            </button>
          )}
        </div>

        <div className="grid grid-cols-10 gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setIndex(i)}
              className={`h-8 rounded text-xs font-medium border ${
                i === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : answers[q.id]
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
