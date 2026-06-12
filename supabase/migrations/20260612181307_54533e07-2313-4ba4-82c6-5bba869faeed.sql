
-- =========================
-- ACHIEVEMENTS (catalog)
-- =========================
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  threshold integer NOT NULL DEFAULT 1,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are readable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

-- =========================
-- USER ACHIEVEMENTS
-- =========================
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "User inserts own achievements"
  ON public.user_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =========================
-- VIDEO LESSONS (public curated)
-- =========================
CREATE TABLE public.video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  level text NOT NULL DEFAULT 'medio',
  description text,
  youtube_id text NOT NULL,
  duration_min integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_lessons TO anon, authenticated;
GRANT ALL ON public.video_lessons TO service_role;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Video lessons are readable by everyone"
  ON public.video_lessons FOR SELECT
  USING (true);

-- =========================
-- VIDEO PROGRESS (per user)
-- =========================
CREATE TABLE public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  favorited boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_progress TO authenticated;
GRANT ALL ON public.video_progress TO service_role;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own video progress"
  ON public.video_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_video_progress_updated_at
  BEFORE UPDATE ON public.video_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- PROFILES: leaderboard opt-in
-- =========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false;

-- =========================
-- LEADERBOARD function (SECURITY DEFINER): only opted-in users
-- =========================
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  xp integer,
  level integer,
  streak_days integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, x.xp, x.level, x.streak_days
  FROM public.profiles p
  JOIN public.user_xp x ON x.user_id = p.id
  WHERE p.leaderboard_opt_in = true
  ORDER BY x.xp DESC, x.streak_days DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

-- =========================
-- SEED achievements
-- =========================
INSERT INTO public.achievements (code, title, description, icon, threshold, kind) VALUES
  ('first_session', 'Primeiro passo', 'Concluiu a primeira sessão de estudo', 'sparkles', 1, 'sessions'),
  ('streak_7',      'Semana cheia',  'Estudou 7 dias seguidos',                  'flame',    7, 'streak'),
  ('streak_30',     'Mês de foco',   'Manteve 30 dias de streak',                'flame',   30, 'streak'),
  ('hours_10',      '10 horas',      'Acumulou 10 horas estudadas',              'clock',   600, 'minutes'),
  ('hours_100',     '100 horas',     'Acumulou 100 horas estudadas',             'medal',  6000, 'minutes'),
  ('level_5',       'Nível 5',       'Alcançou o nível 5',                       'trophy',    5, 'level')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- SEED video lessons
-- =========================
INSERT INTO public.video_lessons (title, subject, level, description, youtube_id, duration_min) VALUES
  ('Funções de 1º grau',           'Matemática', 'medio', 'Conceito, gráfico e exercícios resolvidos.',           'b3rEPjLXf1Q', 18),
  ('Funções de 2º grau',           'Matemática', 'medio', 'Parábola, vértice, raízes e Bhaskara.',                'KZAxoffG3vY', 22),
  ('Trigonometria no triângulo',   'Matemática', 'medio', 'Seno, cosseno e tangente passo a passo.',              'IEqRO92mUvE', 16),
  ('Cinemática — MRU e MRUV',      'Física',     'medio', 'Velocidade, aceleração e gráficos.',                   'F_VqyobyOuU', 20),
  ('Leis de Newton',               'Física',     'medio', 'As três leis explicadas com exemplos do dia a dia.',   'kKKM8Y-u7ds', 15),
  ('Ligações químicas',            'Química',    'medio', 'Iônica, covalente e metálica — quando e por quê.',     'lA2WhJjL4Fk', 14),
  ('Estequiometria',               'Química',    'medio', 'Mol, cálculo estequiométrico e exercícios.',           'WD7n8jHs-uw', 19),
  ('Citologia — a célula',         'Biologia',   'medio', 'Estrutura, organelas e funções.',                      'URUJD5NEXC8', 17),
  ('Genética básica',              'Biologia',   'medio', 'Mendel, dominância e exercícios.',                     'IttwzPfp-yc', 18),
  ('Brasil República',             'História',   'medio', 'Da Proclamação até a Era Vargas.',                     'Em6q9CWFjBM', 21),
  ('Crase sem mistério',           'Português',  'medio', 'Regras práticas e dicas para a prova.',                'wZpD0lpVtP4', 12),
  ('Redação ENEM nota 1000',       'Redação',    'medio', 'Estrutura, repertório e proposta de intervenção.',     'PfXbgmcCqXg', 25)
ON CONFLICT DO NOTHING;
