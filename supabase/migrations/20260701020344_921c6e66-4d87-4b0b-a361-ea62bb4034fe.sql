
-- 1. notificaciones: replace permissive INSERT policy
DROP POLICY IF EXISTS "system insert notifs" ON public.notificaciones;
CREATE POLICY "users insert own notifs" ON public.notificaciones
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = public.current_usuario_id());
-- Triggers and edge functions use service_role which bypasses RLS.

-- 2. creditos: add restrictive write policies (only admins/service_role can write; regular users blocked)
CREATE POLICY "admins manage creditos" ON public.creditos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. pagos: add restrictive INSERT/UPDATE/DELETE (only admins; server code uses service_role)
CREATE POLICY "admins manage pagos" ON public.pagos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. usuarios: add explicit INSERT policy scoped to self
CREATE POLICY "usuario inserta su propia fila" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. storage: remove broad public SELECT on resenas bucket (public bucket still serves via public URL)
DROP POLICY IF EXISTS "resenas public read" ON storage.objects;

-- 6. Revoke EXECUTE from anon/authenticated on trigger and internal functions.
-- Keep executable: has_role, is_admin, current_usuario_id (used in RLS expressions; safe to expose).
REVOKE EXECUTE ON FUNCTION public.alerta_resena_baja() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fill_prestador_denorm() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fill_resena_denorm() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fill_reserva_denorm() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_estado_reserva() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_nueva_reserva() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recalc_prestador_rating() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_prestador_from_usuario() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validar_resena() FROM anon, authenticated, public;
