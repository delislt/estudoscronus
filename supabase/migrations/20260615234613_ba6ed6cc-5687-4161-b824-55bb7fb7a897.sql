
-- Friendships: only addressee can accept/reject. Requester can only delete (cancel).
DROP POLICY IF EXISTS "respond friendship" ON public.friendships;
CREATE POLICY "addressee responds to friendship" ON public.friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());

-- Lock down has_role: invoked from RLS policies (runs as definer, not caller),
-- so revoking direct EXECUTE from clients is safe and prevents misuse.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
