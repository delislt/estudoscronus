import { supabase } from "@/integrations/supabase/client";

export type AchievementRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  kind: "sessions" | "streak" | "minutes" | "level" | string;
};

export type UserStats = {
  totalSessions: number;
  totalMinutes: number;
  streakDays: number;
  level: number;
};

export async function fetchUserStats(userId: string): Promise<UserStats> {
  const [{ data: xp }, { count: sessionCount }, { data: sessions }] = await Promise.all([
    supabase.from("user_xp").select("level, streak_days").eq("user_id", userId).single(),
    supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("study_sessions").select("duration_min").eq("user_id", userId),
  ]);
  const totalMinutes = (sessions ?? []).reduce((s, r) => s + (r.duration_min ?? 0), 0);
  return {
    totalSessions: sessionCount ?? 0,
    totalMinutes,
    streakDays: xp?.streak_days ?? 0,
    level: xp?.level ?? 1,
  };
}

function reached(a: AchievementRow, s: UserStats) {
  switch (a.kind) {
    case "sessions": return s.totalSessions >= a.threshold;
    case "minutes":  return s.totalMinutes >= a.threshold;
    case "streak":   return s.streakDays >= a.threshold;
    case "level":    return s.level >= a.threshold;
    default: return false;
  }
}

// Achievement awarding is performed server-side via `completeStudyTask`
// (see `src/lib/progress.functions.ts`). Clients can no longer insert
// `user_achievements` rows directly — the RLS INSERT policy was removed
// to prevent users from self-granting achievements.
export { reached };

