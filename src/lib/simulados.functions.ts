import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calculateTriEnem, type TriItem } from "@/lib/tri";
import { levelFromXp } from "@/lib/scheduling";

const DISCIPLINES = ["linguagens", "matematica", "ciencias-humanas", "ciencias-natureza"] as const;
type Discipline = (typeof DISCIPLINES)[number];

const DISC_TO_SUBJECT: Record<Discipline, string> = {
  "linguagens": "Linguagens",
  "matematica": "Matemática",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
};

// --- Inicia simulado ENEM ---
export const startEnemAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        year: z.number().int().min(2009).max(2024),
        disciplines: z.array(z.enum(DISCIPLINES)).min(1),
        questionsPerDiscipline: z.number().int().min(5).max(45).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Carrega questões já no banco para os filtros pedidos
    const subjects = data.disciplines.map((d) => DISC_TO_SUBJECT[d]);
    const collected: Array<{ id: string; subject: string }> = [];
    const missing: Discipline[] = [];

    for (const disc of data.disciplines) {
      const subject = DISC_TO_SUBJECT[disc];
      const { data: rows } = await supabase
        .from("questions")
        .select("id, subject")
        .eq("source", "enem")
        .eq("exam_year", data.year)
        .eq("subject", subject)
        .limit(data.questionsPerDiscipline * 3);
      const list = rows ?? [];
      if (list.length < data.questionsPerDiscipline) missing.push(disc);
      // Embaralha e pega N
      const shuffled = list.sort(() => Math.random() - 0.5).slice(0, data.questionsPerDiscipline);
      collected.push(...shuffled);
    }

    // Se faltam questões, importa do enem.dev sob demanda (admin não requerido — dataset público)
    if (missing.length > 0) {
      const { fetchEnemQuestions, enemQuestionToRow } = await import("@/lib/enem-import.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const disc of missing) {
        try {
          const questions = await fetchEnemQuestions(data.year, disc, 45);
          const rows = questions.map(enemQuestionToRow);
          console.log("[enem-import]", disc, "fetched", rows.length, "questions");
          if (rows.length > 0) {
            const { error: upErr } = await supabaseAdmin
              .from("questions")
              .upsert(rows, { onConflict: "source,exam_year,external_id" });
            if (upErr) console.error("[enem-import] upsert failed", disc, upErr);
          }
        } catch (err) {
          console.error("[enem-import]", disc, err);
        }
      }
      // Re-busca
      collected.length = 0;
      for (const disc of data.disciplines) {
        const subject = DISC_TO_SUBJECT[disc];
        const { data: rows } = await supabase
          .from("questions")
          .select("id, subject")
          .eq("source", "enem")
          .eq("exam_year", data.year)
          .eq("subject", subject)
          .limit(data.questionsPerDiscipline * 3);
        const shuffled = (rows ?? []).sort(() => Math.random() - 0.5).slice(0, data.questionsPerDiscipline);
        collected.push(...shuffled);
      }
    }

    if (collected.length === 0) {
      throw new Error("Não foi possível carregar questões para esse simulado.");
    }

    const questionIds = collected.map((q) => q.id);
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .insert({
        user_id: userId,
        source: `enem-${data.year}`,
        subjects,
        question_ids: questionIds,
        total_questions: questionIds.length,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { attemptId: attempt.id };
  });

// --- Carrega simulado em andamento ---
export const getAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .single();
    if (error || !attempt) throw new Error("Simulado não encontrado");

    const { data: questions } = await supabase
      .from("questions")
      .select("id, subject, topic, statement, alternatives, correct_label, exam_year")
      .in("id", attempt.question_ids);

    // Ordena na sequência original
    const byId = new Map((questions ?? []).map((q) => [q.id, q]));
    const ordered = attempt.question_ids.map((id: string) => byId.get(id)).filter(Boolean);

    const { data: answers } = await supabase
      .from("exam_answers")
      .select("question_id, chosen_label, is_correct")
      .eq("attempt_id", data.attemptId);

    return { attempt, questions: ordered, answers: answers ?? [] };
  });

// --- Responde uma questão ---
export const answerQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        attemptId: z.string().uuid(),
        questionId: z.string().uuid(),
        chosenLabel: z.string().min(1).max(2),
        timeMs: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: q } = await supabase
      .from("questions")
      .select("correct_label")
      .eq("id", data.questionId)
      .single();
    const isCorrect = q?.correct_label === data.chosenLabel;
    const { error } = await supabase.from("exam_answers").upsert(
      {
        attempt_id: data.attemptId,
        user_id: userId,
        question_id: data.questionId,
        chosen_label: data.chosenLabel,
        is_correct: isCorrect,
        time_ms: data.timeMs ?? null,
      },
      { onConflict: "attempt_id,question_id" },
    );
    if (error) throw error;
    return { isCorrect };
  });

// --- Finaliza simulado e calcula TRI ---
export const finishAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .single();
    if (!attempt) throw new Error("Simulado não encontrado");

    const { data: questions } = await supabase
      .from("questions")
      .select("id, subject, difficulty, discrimination, guessing, correct_label")
      .in("id", attempt.question_ids);
    const { data: answers } = await supabase
      .from("exam_answers")
      .select("question_id, chosen_label, is_correct")
      .eq("attempt_id", data.attemptId);

    const byQ = new Map((answers ?? []).map((a) => [a.question_id, a]));
    const qMap = new Map((questions ?? []).map((q) => [q.id, q]));

    let correct = 0;
    const perSubject: Record<string, { total: number; correct: number; tri?: number }> = {};
    const triBySubject: Record<string, TriItem[]> = {};

    for (const qid of attempt.question_ids) {
      const q = qMap.get(qid);
      const a = byQ.get(qid);
      if (!q) continue;
      const isCorrect = a?.is_correct === true;
      if (isCorrect) correct++;
      perSubject[q.subject] = perSubject[q.subject] ?? { total: 0, correct: 0 };
      perSubject[q.subject].total++;
      if (isCorrect) perSubject[q.subject].correct++;
      triBySubject[q.subject] = triBySubject[q.subject] ?? [];
      triBySubject[q.subject].push({
        a: q.discrimination ?? 1,
        b: q.difficulty ?? 0,
        c: q.guessing ?? 0.2,
        correct: isCorrect,
      });
    }

    // Calcula TRI por matéria e média geral
    let triSum = 0;
    let triCount = 0;
    for (const [subject, items] of Object.entries(triBySubject)) {
      const score = calculateTriEnem(items);
      perSubject[subject].tri = score;
      triSum += score;
      triCount++;
    }
    const triAvg = triCount > 0 ? Math.round(triSum / triCount) : null;
    const rawScore = Math.round((correct / Math.max(1, attempt.total_questions)) * 1000);

    const { error: upErr } = await supabase
      .from("exam_attempts")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
        correct_count: correct,
        raw_score: rawScore,
        tri_score: triAvg,
        per_subject: perSubject,
      })
      .eq("id", data.attemptId);
    if (upErr) throw upErr;

    // Concede XP/Moedas pela conclusão
    const xpGain = 50 + correct * 5;
    const coinGain = 10 + Math.floor(correct / 2);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: xpRow } = await supabaseAdmin
      .from("user_xp")
      .select("xp, coins")
      .eq("user_id", userId)
      .maybeSingle();
    if (xpRow) {
      await supabaseAdmin
        .from("user_xp")
        .update({
          xp: (xpRow.xp ?? 0) + xpGain,
          coins: (xpRow.coins ?? 0) + coinGain,
        })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from("user_xp")
        .insert({ user_id: userId, xp: xpGain, coins: coinGain });
    }

    return { rawScore, triScore: triAvg, correct, perSubject, xpGain, coinGain };
  });

// --- Lista tentativas do usuário ---
export const listAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("exam_attempts")
      .select("id, source, subjects, total_questions, correct_count, tri_score, raw_score, status, started_at, finished_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

// --- Apaga simulado ---
export const deleteAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("exam_answers").delete().eq("attempt_id", data.attemptId).eq("user_id", userId);
    const { error } = await supabase
      .from("exam_attempts")
      .delete()
      .eq("id", data.attemptId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
