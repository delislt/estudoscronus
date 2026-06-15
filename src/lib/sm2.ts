// SM-2 algorithm (Anki-like) for spaced repetition.
// Rating: again | hard | good | easy
export type Rating = "again" | "hard" | "good" | "easy";

export type CardState = {
  ease: number; // factor, min 1.3
  interval_days: number;
  reps: number;
  lapses: number;
};

export type NextState = CardState & { due_at: Date };

export function scheduleNext(state: CardState, rating: Rating, now = new Date()): NextState {
  let { ease, interval_days, reps, lapses } = state;

  if (rating === "again") {
    lapses += 1;
    reps = 0;
    interval_days = 0; // re-show same session
    ease = Math.max(1.3, ease - 0.2);
  } else {
    const quality = rating === "hard" ? 3 : rating === "good" ? 4 : 5;
    // Update ease (SM-2 formula)
    ease = Math.max(
      1.3,
      ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    );
    if (reps === 0) {
      interval_days = rating === "hard" ? 1 : rating === "good" ? 2 : 4;
    } else if (reps === 1) {
      interval_days = rating === "hard" ? 3 : rating === "good" ? 6 : 10;
    } else {
      const mult = rating === "hard" ? 1.2 : rating === "good" ? ease : ease * 1.3;
      interval_days = Math.round(interval_days * mult);
    }
    reps += 1;
  }

  const due_at = new Date(now);
  if (interval_days === 0) {
    // Re-show in ~10 minutes
    due_at.setMinutes(due_at.getMinutes() + 10);
  } else {
    due_at.setDate(due_at.getDate() + interval_days);
  }

  return { ease, interval_days, reps, lapses, due_at };
}
