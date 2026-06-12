
DROP POLICY IF EXISTS "xp self" ON public.user_xp;
CREATE POLICY "user_xp self read" ON public.user_xp
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User inserts own achievements" ON public.user_achievements;

CREATE POLICY "profiles leaderboard read" ON public.profiles
  FOR SELECT TO authenticated
  USING (leaderboard_opt_in = true);

CREATE POLICY "user_xp leaderboard read" ON public.user_xp
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_xp.user_id AND p.leaderboard_opt_in = true
  ));

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, xp integer, level integer, streak_days integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.avatar_url, x.xp, x.level, x.streak_days
  FROM public.profiles p
  JOIN public.user_xp x ON x.user_id = p.id
  WHERE p.leaderboard_opt_in = true
  ORDER BY x.xp DESC, x.streak_days DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;
