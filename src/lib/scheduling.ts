// Pure helpers for scheduling and XP. No I/O.

export type SubjectLite = { id: string; name: string; difficulty: number };

const DAY_NAMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function dayLabel(d: Date) {
  return DAY_NAMES[d.getDay()];
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Generate a 14-day schedule.
 * - Only on study_days (0=Sun..6=Sat).
 * - Each study day filled with ~ hoursPerDay * 60 minutes of tasks (block size 30 min).
 * - Subjects with higher difficulty get more blocks (weight = difficulty).
 * - Every 4th block is a "Revisão" of the previous subject (espaçada simples).
 */
export function generateSchedule(opts: {
  subjects: SubjectLite[];
  hoursPerDay: number;
  studyDays: number[];
  startDate?: Date;
  days?: number;
}) {
  const { subjects, hoursPerDay, studyDays } = opts;
  const start = opts.startDate ?? new Date();
  const days = opts.days ?? 14;
  const blockMin = 30;
  const tasks: {
    subject_id: string | null;
    title: string;
    scheduled_date: string;
    duration_min: number;
    is_review: boolean;
  }[] = [];

  if (!subjects.length) return tasks;

  // Weighted pool of subjects by difficulty
  const pool: SubjectLite[] = [];
  for (const s of subjects) {
    const w = Math.max(1, Math.min(5, s.difficulty));
    for (let i = 0; i < w; i++) pool.push(s);
  }

  let cursor = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (!studyDays.includes(d.getDay())) continue;

    const totalBlocks = Math.max(1, Math.round((hoursPerDay * 60) / blockMin));
    let lastSubject: SubjectLite | null = null;
    for (let b = 0; b < totalBlocks; b++) {
      const isReview: boolean = b > 0 && b % 4 === 0 && lastSubject !== null;
      const subject: SubjectLite =
        isReview && lastSubject ? lastSubject : pool[cursor++ % pool.length];
      tasks.push({
        subject_id: subject.id,
        title: isReview ? `Revisão — ${subject.name}` : subject.name,
        scheduled_date: toISODate(d),
        duration_min: blockMin,
        is_review: isReview,
      });
      lastSubject = subject;
    }
  }

  return tasks;
}

export function xpForMinutes(min: number) {
  // 1 XP por minuto, bônus de 5 a cada 30 min
  return min + Math.floor(min / 30) * 5;
}

export function levelFromXp(xp: number) {
  // Cada nível custa 100 * nivel XP (tri).
  let lvl = 1;
  let need = 100;
  let remaining = xp;
  while (remaining >= need) {
    remaining -= need;
    lvl++;
    need = 100 * lvl;
  }
  return { level: lvl, xpInLevel: remaining, xpToNext: need };
}
