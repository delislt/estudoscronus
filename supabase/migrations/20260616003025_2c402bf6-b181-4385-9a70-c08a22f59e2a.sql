DROP POLICY IF EXISTS "own inventory" ON public.user_inventory;

CREATE POLICY "inventory select own"
  ON public.user_inventory FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "inventory update equip own"
  ON public.user_inventory FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());