-- Admin puede actualizar cualquier reserva (cancelar / marcar completada desde /admin/reservas).
-- Los triggers de transición ya eximen a is_admin(); faltaba la política RLS de UPDATE.
DROP POLICY IF EXISTS "admin actualiza reservas" ON public.reservas;
CREATE POLICY "admin actualiza reservas" ON public.reservas
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
