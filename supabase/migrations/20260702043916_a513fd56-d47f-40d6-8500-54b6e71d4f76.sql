-- ============================================================
-- 1) SECURITY DEFINER function exposure (SUPA_anon / SUPA_authenticated)
--    - has_role: not needed by clients at all (only called inside is_admin,
--      which runs as owner) -> revoke from anon + authenticated + PUBLIC.
--    - is_admin / current_usuario_id: required ONLY by authenticated RLS
--      policies -> executable by authenticated only, never by anon.
--      (Also repairs the current regression: anon reads on prestadores were
--      failing with "permission denied for function current_usuario_id".)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_usuario_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_usuario_id() TO authenticated;

-- ============================================================
-- 2) Scope every user/admin policy to authenticated (user_roles_public_manage)
--    Anonymous visitors keep only the truly public catalog reads.
-- ============================================================
ALTER POLICY "usuario lee sus creditos" ON public.creditos TO authenticated;
ALTER POLICY "cliente agrega favoritos" ON public.favoritos TO authenticated;
ALTER POLICY "cliente borra sus favoritos" ON public.favoritos TO authenticated;
ALTER POLICY "cliente lee sus favoritos" ON public.favoritos TO authenticated;
ALTER POLICY "participantes envian mensajes" ON public.mensajes TO authenticated;
ALTER POLICY "participantes leen mensajes" ON public.mensajes TO authenticated;
ALTER POLICY "participantes marcan leido" ON public.mensajes TO authenticated;
ALTER POLICY "users read own notifs" ON public.notificaciones TO authenticated;
ALTER POLICY "users update own notifs" ON public.notificaciones TO authenticated;
ALTER POLICY "participantes leen pagos" ON public.pagos TO authenticated;
ALTER POLICY "users insert own prestador_servicios" ON public.prestador_servicios TO authenticated;
ALTER POLICY "users delete own prestador_servicios" ON public.prestador_servicios TO authenticated;
ALTER POLICY "admin actualiza prestadores" ON public.prestadores TO authenticated;
ALTER POLICY "users insert own prestador" ON public.prestadores TO authenticated;
ALTER POLICY "users update own prestador" ON public.prestadores TO authenticated;
ALTER POLICY "admin actualiza reportes" ON public.reportes TO authenticated;
ALTER POLICY "cliente crea reporte" ON public.reportes TO authenticated;
ALTER POLICY "lee mis reportes" ON public.reportes TO authenticated;
ALTER POLICY "participantes leen reservas" ON public.reservas TO authenticated;
ALTER POLICY "admins manage roles" ON public.user_roles TO authenticated;
ALTER POLICY "admins read roles" ON public.user_roles TO authenticated;
ALTER POLICY "users update own usuario" ON public.usuarios TO authenticated;
ALTER POLICY "usuario lee su propia fila" ON public.usuarios TO authenticated;
ALTER POLICY "admin actualiza verificaciones" ON public.verificaciones_prestador TO authenticated;
ALTER POLICY "admin lee todas verificaciones" ON public.verificaciones_prestador TO authenticated;
ALTER POLICY "prestador crea sus verificaciones" ON public.verificaciones_prestador TO authenticated;
ALTER POLICY "prestador lee sus verificaciones" ON public.verificaciones_prestador TO authenticated;

-- Storage policies that rely on auth.uid()/is_admin(): scope to authenticated too
ALTER POLICY "prestador actualiza verificaciones" ON storage.objects TO authenticated;
ALTER POLICY "prestador borra verificaciones" ON storage.objects TO authenticated;
ALTER POLICY "prestador lee verificaciones" ON storage.objects TO authenticated;
ALTER POLICY "prestador sube verificaciones" ON storage.objects TO authenticated;
ALTER POLICY "usuario actualiza su avatar" ON storage.objects TO authenticated;
ALTER POLICY "usuario borra su avatar" ON storage.objects TO authenticated;
ALTER POLICY "usuario sube su avatar" ON storage.objects TO authenticated;

-- Split the prestadores read policy so anonymous visitors never evaluate
-- helper functions: anon sees only non-suspended providers.
DROP POLICY "public read prestadores" ON public.prestadores;
CREATE POLICY "anon read prestadores"
  ON public.prestadores FOR SELECT TO anon
  USING (suspendido = false);
CREATE POLICY "auth read prestadores"
  ON public.prestadores FOR SELECT TO authenticated
  USING (suspendido = false OR is_admin() OR usuario_id = current_usuario_id());

-- ============================================================
-- 3) Providers can only edit their reply on reviews (prestador_review_tamper)
--    Column-level privilege: UPDATE limited to the reply fields.
-- ============================================================
REVOKE UPDATE ON public.resenas FROM anon, authenticated;
GRANT UPDATE (respuesta_prestador, respuesta_fecha) ON public.resenas TO authenticated;

-- ============================================================
-- 4) Protect admin-controlled provider fields (prestador_self_unsuspend)
--    SECURITY INVOKER trigger: blocks non-admin authenticated users from
--    changing moderation/verification/rating fields. Internal jobs
--    (service_role, SECURITY DEFINER rating recalc) are unaffected.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_prestador_admin_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_admin() THEN
    IF NEW.suspendido IS DISTINCT FROM OLD.suspendido
       OR NEW.verificado IS DISTINCT FROM OLD.verificado
       OR NEW.verificado_identidad IS DISTINCT FROM OLD.verificado_identidad
       OR NEW.antecedentes_ok IS DISTINCT FROM OLD.antecedentes_ok
       OR NEW.calificacion_promedio IS DISTINCT FROM OLD.calificacion_promedio
       OR NEW.resenas_count IS DISTINCT FROM OLD.resenas_count
       OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
       OR NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'No autorizado: campos administrativos protegidos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_prestador_admin_cols() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_prestador_admin_cols ON public.prestadores;
CREATE TRIGGER trg_protect_prestador_admin_cols
  BEFORE UPDATE ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.protect_prestador_admin_cols();

-- ============================================================
-- 5) Server-side booking price (booking_price_clientside)
--    Trigger recomputes total + 15% fee from the provider's listed service
--    price, ignoring whatever the client sends. Any attempt to tamper with
--    total on UPDATE is recomputed as well.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fill_reserva_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_precio integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.total IS NOT DISTINCT FROM OLD.total
     AND NEW.servicio_id IS NOT DISTINCT FROM OLD.servicio_id
     AND NEW.prestador_id IS NOT DISTINCT FROM OLD.prestador_id THEN
    RETURN NEW; -- price fields untouched
  END IF;

  IF NEW.servicio_id IS NOT NULL THEN
    SELECT precio INTO v_precio
      FROM public.prestador_servicios
     WHERE prestador_id = NEW.prestador_id AND servicio_id = NEW.servicio_id
     LIMIT 1;
  END IF;

  IF v_precio IS NOT NULL THEN
    NEW.comision := ROUND(v_precio * 0.15);
    NEW.total := v_precio + NEW.comision;
  END IF;

  IF NEW.total IS NULL OR NEW.total <= 0 THEN
    RAISE EXCEPTION 'Total de reserva inválido';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fill_reserva_total() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_fill_reserva_total ON public.reservas;
CREATE TRIGGER trg_fill_reserva_total
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.fill_reserva_total();

-- ============================================================
-- 6) Explicit SELECT policies for public buckets
--    (avatars_no_select_policy / resenas_bucket_no_select_policy)
--    avatars: public read (expected). resenas: authenticated read only, to
--    keep anonymous bucket listing disabled as previously hardened.
-- ============================================================
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "resenas authenticated read" ON storage.objects;
CREATE POLICY "resenas authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resenas');