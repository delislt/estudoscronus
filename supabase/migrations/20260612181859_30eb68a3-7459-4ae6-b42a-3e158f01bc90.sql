
DROP TABLE IF EXISTS public.video_progress;
DROP TABLE IF EXISTS public.video_lessons;

CREATE TABLE public.video_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  level text NOT NULL DEFAULT 'medio',
  description text,
  reason text,
  search_query text NOT NULL,
  channel_hint text,
  duration_hint text,
  favorited boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_recommendations TO authenticated;
GRANT ALL ON public.video_recommendations TO service_role;

ALTER TABLE public.video_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own recommendations"
  ON public.video_recommendations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX video_recommendations_user_created_idx
  ON public.video_recommendations(user_id, created_at DESC);

CREATE TRIGGER set_video_recommendations_updated_at
  BEFORE UPDATE ON public.video_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
