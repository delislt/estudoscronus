
ALTER TABLE public.video_recommendations
  ADD COLUMN IF NOT EXISTS video_id text,
  ADD COLUMN IF NOT EXISTS resolved_title text;

ALTER TABLE public.schedule_tasks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS ai_reason text,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS skipped boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS schedule_tasks_user_date_idx
  ON public.schedule_tasks (user_id, scheduled_date);
