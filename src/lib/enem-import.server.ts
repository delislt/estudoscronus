// Importador server-side do dataset público enem.dev
// Faz fetch e upsert das questões na tabela `questions`.

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

export async function fetchEnemQuestions(year: number, discipline: string, limit = 30, language?: string) {
  const params = new URLSearchParams({
    limit: String(limit),
    discipline,
  });
  if (language) params.set("language", language);
  const url = `https://api.enem.dev/v1/exams/${year}/questions?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`enem.dev fetch falhou: ${res.status}`);
  const json = (await res.json()) as { questions: EnemQuestion[] };
  return json.questions;
}

export function enemQuestionToRow(q: EnemQuestion) {
  const statement = [q.context, q.alternativesIntroduction].filter(Boolean).join("\n\n");
  const alternatives = q.alternatives
    .filter((a) => a.text)
    .map((a) => ({ label: a.letter, text: a.text }));
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
