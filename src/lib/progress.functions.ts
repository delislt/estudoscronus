import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { xpForMinutes, levelFromXp, toISODate } from "@/lib/scheduling";

type Achievement = {
  id: string;
  title: string;
  description: string;
  threshold: number;
  kind: string;
};

function reached(a: Achievement, s: { totalSessions: number; totalMinutes: number; streakDays: number; level: number }) {
  switch (a.kind) {
    case "sessions": return s.totalSessions >= a.threshold;
    case "minutes":  return s.totalMinutes >= a.threshold;
    case "streak":   return s.streakDays >= a.threshold;
    case "level":    return s.level >= a.threshold;
    default: return false;
  }
}

/**
 * Completes a study task on the server. Updates the task, inserts a study
 * session, awards XP / updates streak, bumps the weekly goal, and awards
 * any newly earned achievements. All writes that touch protected tables
 * (`user_xp`, `user_achievements`) use the admin client so they cannot be
 * tampered with from the browser.
 */
export const completeStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load the task — RLS ensures it's the caller's
    const { data: task, error: taskErr } = await supabase
      .from("schedule_tasks")
      .select("id, user_id, duration_min, subject_id, completed")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw new Error(taskErr.message);
    if (!task) throw new Error("Task not found");
    if (task.user_id !== userId) throw new Error("Forbidden");
    if (task.completed) return { gainedXp: 0, newlyUnlocked: [] as Achievement[] };

    const today = toISODate(new Date());
    const duration = Math.max(1, Math.min(480, task.duration_min ?? 0));

    // Mark task complete (RLS-scoped)
    await supabase
      .from("schedule_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", task.id);

    // Weekly goal bump — always reflect current completed state (RLS-scoped)
    const { data: weekly } = await supabase
      .from("goals")
      .select("id, target_value, current_value")
      .eq("user_id", userId)
      .eq("period", "weekly")
      .maybeSingle();
    if (weekly) {
      await supabase
        .from("goals")
        .update({ current_value: Math.min(weekly.target_value, weekly.current_value + duration) })
        .eq("id", weekly.id);
    }

    // If a study session already exists for this task (user previously completed
    // and then unmarked it), don't award XP/streak again — only re-mark + goal.
    const { data: existingSession } = await supabase
      .from("study_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("task_id", task.id)
      .maybeSingle();
    if (existingSession) {
      return { gainedXp: 0, newlyUnlocked: [] as Achievement[] };
    }

    // Insert study session (RLS-scoped)
    await supabase.from("study_sessions").insert({
      user_id: userId,
      task_id: task.id,
      subject_id: task.subject_id,
      duration_min: duration,
    });

    // XP / streak / level — protected table, must use admin
    const { data: xpRow } = await supabaseAdmin
      .from("user_xp")
      .select("xp, level, streak_days, last_study_date")
      .eq("user_id", userId)
      .maybeSingle();

    const gainedXp = xpForMinutes(duration);
    const lastDate = xpRow?.last_study_date ?? null;
    let streak = xpRow?.streak_days ?? 0;
    if (lastDate !== today) {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      streak = lastDate === toISODate(yest) ? streak + 1 : 1;
    }
    const newXp = (xpRow?.xp ?? 0) + gainedXp;
    const { level } = levelFromXp(newXp);

    if (xpRow) {
      await supabaseAdmin
        .from("user_xp")
        .update({ xp: newXp, level, streak_days: streak, last_study_date: today })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin.from("user_xp").insert({
        user_id: userId, xp: newXp, level, streak_days: streak, last_study_date: today,
      });
    }

    // Achievement check — protected insert, must use admin
    const [{ data: allAch }, { data: owned }, { count: totalSessions }, { data: allSessions }] = await Promise.all([
      supabaseAdmin.from("achievements").select("id, title, description, threshold, kind"),
      supabaseAdmin.from("user_achievements").select("achievement_id").eq("user_id", userId),
      supabaseAdmin.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("study_sessions").select("duration_min").eq("user_id", userId),
    ]);
    const totalMinutes = (allSessions ?? []).reduce((s: number, r: any) => s + (r.duration_min ?? 0), 0);
    const stats = { totalSessions: totalSessions ?? 0, totalMinutes, streakDays: streak, level };
    const ownedIds = new Set((owned ?? []).map((r: any) => r.achievement_id));
    const newly: Achievement[] = [];
    for (const a of (allAch ?? []) as Achievement[]) {
      if (ownedIds.has(a.id)) continue;
      if (reached(a, stats)) newly.push(a);
    }
    if (newly.length) {
      await supabaseAdmin
        .from("user_achievements")
        .insert(newly.map((a) => ({ user_id: userId, achievement_id: a.id })));
    }

    return { gainedXp, newlyUnlocked: newly };
  });

/**
 * Reverts a previously completed study task: unmarks it, removes the related
 * study_session, and subtracts the XP previously awarded.
 */
export const uncompleteStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: task, error: taskErr } = await supabase
      .from("schedule_tasks")
      .select("id, user_id, duration_min, completed")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw new Error(taskErr.message);
    if (!task) throw new Error("Task not found");
    if (task.user_id !== userId) throw new Error("Forbidden");
    if (!task.completed) return { ok: true };

    // Only unmark the task. Keep the study_session and XP intact so the user
    // cannot farm XP by toggling complete/uncomplete. Re-completing won't
    // award XP again because completeStudyTask detects the existing session.
    await supabase
      .from("schedule_tasks")
      .update({ completed: false, completed_at: null })
      .eq("id", task.id);

    // Roll back the weekly goal so progress reflects current completed tasks.
    const duration = Math.max(1, Math.min(480, task.duration_min ?? 0));
    const { data: weekly } = await supabase
      .from("goals")
      .select("id, current_value")
      .eq("user_id", userId)
      .eq("period", "weekly")
      .maybeSingle();
    if (weekly) {
      await supabase
        .from("goals")
        .update({ current_value: Math.max(0, weekly.current_value - duration) })
        .eq("id", weekly.id);
    }

    return { ok: true };
  });
