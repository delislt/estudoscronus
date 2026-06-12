REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;