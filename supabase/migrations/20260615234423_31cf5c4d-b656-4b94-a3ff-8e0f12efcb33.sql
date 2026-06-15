
-- Lock down privilege-sensitive tables: only service_role (server-side admin) may write.
REVOKE INSERT, UPDATE, DELETE ON public.user_xp FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_achievements FROM authenticated, anon;
GRANT ALL ON public.user_xp TO service_role;
GRANT ALL ON public.user_achievements TO service_role;

-- Explicit deny-write policies make intent clear and survive future grant changes.
CREATE POLICY "Block client writes to user_xp" ON public.user_xp
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client writes to user_achievements" ON public.user_achievements
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Block client updates to user_achievements" ON public.user_achievements
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes to user_achievements" ON public.user_achievements
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);

-- app_config: restrict to server-side only; document intent.
REVOKE ALL ON public.app_config FROM authenticated, anon;
GRANT ALL ON public.app_config TO service_role;
COMMENT ON TABLE public.app_config IS 'Server-only configuration. Accessed exclusively via service_role from server functions. No client access intended.';
CREATE POLICY "Block all client access to app_config" ON public.app_config
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
