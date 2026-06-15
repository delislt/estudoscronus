import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Forgetting curve detector.
 * Flags items the user is about to forget:
 *  - Flashcards overdue (due_at < now) or with high lapses
 *  - Subjects without study sessions in the last 5+ days
 *  - Past schedule tasks not completed (gaps)
 */
export const detectForgetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const now = new Date();
    const nowIso = now.toISOString();
    const cutoff5d = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const [cardsRes, sessionsRes, subjectsRes, tasksRes] = await Promise.all([
      context.supabase
        .from("flashcards")
        .select("id, front, due_at, lapses, deck_id, decks(name)")
        .lte("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(50),
      context.supabase
        .from("study_sessions")
        .select("subject_id, created_at")
        .gte("created_at", cutoff5d),
      context.supabase
        .from("subjects")
        .select("id, name, color, difficulty")
        .eq("user_id", uid),
      context.supabase
        .from("schedule_tasks")
        .select("id, title, subject_id, scheduled_date, topic")
        .eq("user_id", uid)
        .eq("completed", false)
        .eq("skipped", false)
        .lt("scheduled_date", now.toISOString().slice(0, 10))
        .order("scheduled_date", { ascending: false })
        .limit(20),
    ]);

    const recentSubjects = new Set(
      (sessionsRes.data ?? [])
        .map((s) => s.subject_id)
        .filter((x): x is string => !!x),
    );

    const coldSubjects = (subjectsRes.data ?? [])
      .filter((s) => !recentSubjects.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        difficulty: s.difficulty,
        risk: s.difficulty >= 4 ? "alta" : s.difficulty >= 3 ? "média" : "baixa",
      }));

    const dueCards = (cardsRes.data ?? []).map((c: any) => ({
      id: c.id,
      front: c.front,
      due_at: c.due_at,
      lapses: c.lapses,
      deck_id: c.deck_id,
      deck_name: c.decks?.name ?? "Deck",
      overdue_days: Math.max(
        0,
        Math.floor((now.getTime() - new Date(c.due_at).getTime()) / (24 * 60 * 60 * 1000)),
      ),
    }));

    const missedTasks = tasksRes.data ?? [];

    return {
      due_cards: dueCards,
      cold_subjects: coldSubjects,
      missed_tasks: missedTasks,
      score:
        dueCards.length * 2 +
        coldSubjects.length * 3 +
        missedTasks.length * 1,
    };
  });
