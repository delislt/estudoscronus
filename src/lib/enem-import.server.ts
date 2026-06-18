// Importador server-side do dataset público enem.dev
// O endpoint /exams/{year}/questions NÃO filtra por discipline; usamos o
// índice em /exams/{year} para descobrir os índices da disciplina escolhida
// e buscamos cada questão individualmente.

const DISCIPLINE_TO_SUBJECT: Record<string, string> = {
  "linguagens": "Linguagens",
  "matematica": "Matemática",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
};

type EnemQuestion = {
  title: string;
  index: number;
  discipline: string;
  language: string | null;
  year: number;
  context: string | null;
  alternativesIntroduction: string | null;
  correctAlternative: string;
  alternatives: Array<{ letter: string; text: string | null; file: string | null; isCorrect: boolean }>;
};

type ExamIndexEntry = {
  index: number;
  discipline: string;
  language: string | null;
};

async function fetchExamIndex(year: number): Promise<ExamIndexEntry[]> {
  const res = await fetch(`https://api.enem.dev/v1/exams/${year}`);
  if (!res.ok) throw new Error(`enem.dev /exams/${year} falhou: ${res.status}`);
  const json = (await res.json()) as { questions: ExamIndexEntry[] };
  return json.questions ?? [];
}

export async function fetchEnemQuestion(year: number, index: number, language?: string): Promise<EnemQuestion | null> {
  const url = new URL(`https://api.enem.dev/v1/exams/${year}/questions/${index}`);
  if (language) url.searchParams.set("language", language);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  return (await res.json()) as EnemQuestion;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export async function fetchEnemQuestions(
  year: number,
  discipline: string,
  count = 30,
  language?: string,
): Promise<EnemQuestion[]> {
  const index = await fetchExamIndex(year);
  let candidates = index.filter((q) => q.discipline === discipline);
  if (discipline === "linguagens" && language) {
    // 1-5 são questões de língua estrangeira; restrinja ao idioma escolhido
    candidates = candidates.filter((q) => q.language === null || q.language === language);
  }
  const chosen = pickRandom(candidates, Math.min(count, candidates.length));
  const results = await Promise.all(
    chosen.map((c) =>
      fetchEnemQuestion(year, c.index, c.language ?? undefined).catch((err) => {
        console.error("[enem-import] questão", c.index, err);
        return null;
      }),
    ),
  );
  return results.filter((q): q is EnemQuestion => q !== null);
}

export function enemQuestionToRow(q: EnemQuestion) {
  const statement = [q.context, q.alternativesIntroduction].filter(Boolean).join("\n\n");
  const alternatives = q.alternatives.map((a) => ({
    label: a.letter,
    text: a.text ?? "",
    file: a.file ?? null,
  }));
  return {
    external_id: `enem:${q.year}:${q.index}:${q.language ?? "pt"}`,
    source: "enem",
    exam_year: q.year,
    subject: DISCIPLINE_TO_SUBJECT[q.discipline] ?? q.discipline,
    topic: q.discipline,
    statement,
    alternatives,
    correct_label: q.correctAlternative,
    // parâmetros TRI padrão; calibrados depois conforme respostas
    difficulty: 0,
    discrimination: 1,
    guessing: 0.2,
  };
}

export { DISCIPLINE_TO_SUBJECT };
