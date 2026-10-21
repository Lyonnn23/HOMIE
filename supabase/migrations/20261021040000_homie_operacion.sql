-- ============================================================
-- Homie operación: admin, agenda sin choques, código de confirmación,
-- geolocalización, liquidaciones a profesionales, cancelaciones.
-- ============================================================

-- 1) Administrador: el dueño de la app. Se asigna por correo (idempotente, y
--    también al registrarse si aún no existe la cuenta).
CREATE OR REPLACE FUNCTION public.asignar_admin_por_email(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'superadmin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.asignar_admin_por_email(text) FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.admin_emails (email text PRIMARY KEY);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_emails (email) VALUES ('tommy.valenzuelaramirez@gmail.com') ON CONFLICT DO NOTHING;
SELECT public.asignar_admin_por_email('tommy.valenzuelaramirez@gmail.com');

-- Si el correo admin se registra después, se le asigna el rol automáticamente
CREATE OR REPLACE FUNCTION public.auto_admin_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_admin ON auth.users;
CREATE TRIGGER trg_auto_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_admin_on_signup();

-- 2) Agenda sin choques: no se puede reservar fuera del horario del profesional
--    ni en una hora ya tomada (ventana de 1 hora). Admin y service_role exentos.
CREATE OR REPLACE FUNCTION public.validar_agenda_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_h jsonb; v_dia text; v_cfg jsonb; v_desde time; v_hasta time;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.fecha = OLD.fecha AND NEW.hora = OLD.hora AND NEW.prestador_id = OLD.prestador_id THEN RETURN NEW; END IF;
  IF NEW.fecha < CURRENT_DATE THEN RAISE EXCEPTION 'La fecha ya pasó'; END IF;

  SELECT horario INTO v_h FROM public.prestadores WHERE id = NEW.prestador_id;
  v_dia := (ARRAY['dom','lun','mar','mie','jue','vie','sab'])[EXTRACT(DOW FROM NEW.fecha)::int + 1];
  v_cfg := v_h -> v_dia;
  IF v_cfg IS NOT NULL THEN
    IF COALESCE((v_cfg->>'activo')::boolean, true) = false THEN
      RAISE EXCEPTION 'El profesional no atiende ese día';
    END IF;
    v_desde := (v_cfg->>'desde')::time; v_hasta := (v_cfg->>'hasta')::time;
    IF v_desde IS NOT NULL AND v_hasta IS NOT NULL AND (NEW.hora < v_desde OR NEW.hora >= v_hasta) THEN
      RAISE EXCEPTION 'Hora fuera del horario de atención (% a %)', to_char(v_desde,'HH24:MI'), to_char(v_hasta,'HH24:MI');
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reservas r
     WHERE r.prestador_id = NEW.prestador_id AND r.fecha = NEW.fecha
       AND r.id IS DISTINCT FROM NEW.id
       AND r.estado IN ('pendiente','confirmada','en_camino')
       AND abs(EXTRACT(EPOCH FROM (r.hora - NEW.hora))) < 3600
  ) THEN
    RAISE EXCEPTION 'Esa hora ya está reservada. Elige otra.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.validar_agenda_reserva() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_validar_agenda_reserva ON public.reservas;
CREATE TRIGGER trg_validar_agenda_reserva BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_agenda_reserva();

-- Horas ocupadas de un profesional (para pintar la agenda al reservar)
CREATE OR REPLACE FUNCTION public.horas_ocupadas(_prestador_id uuid, _fecha date)
RETURNS TABLE (hora time) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hora FROM public.reservas
   WHERE prestador_id = _prestador_id AND fecha = _fecha AND estado IN ('pendiente','confirmada','en_camino');
$$;
GRANT EXECUTE ON FUNCTION public.horas_ocupadas(uuid, date) TO anon, authenticated;

-- 3) Código de confirmación: el cliente se lo entrega al profesional al terminar.
--    Vive en una tabla aparte para que el prestador NO pueda leerlo (RLS por fila).
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS completada_at timestamptz;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cancelada_por text CHECK (cancelada_por IS NULL OR cancelada_por IN ('cliente','prestador','admin'));
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS motivo_cancelacion text;

CREATE TABLE IF NOT EXISTS public.reserva_codigos (
  reserva_id uuid PRIMARY KEY REFERENCES public.reservas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  intentos int NOT NULL DEFAULT 0
);
ALTER TABLE public.reserva_codigos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cliente lee su codigo" ON public.reserva_codigos;
CREATE POLICY "cliente lee su codigo" ON public.reserva_codigos FOR SELECT TO authenticated
  USING (reserva_id IN (SELECT id FROM public.reservas WHERE cliente_id = public.current_usuario_id()) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.gen_codigo_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.reserva_codigos (reserva_id, codigo)
  VALUES (NEW.id, lpad((floor(random() * 10000))::int::text, 4, '0')) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_gen_codigo_reserva ON public.reservas;
CREATE TRIGGER trg_gen_codigo_reserva AFTER INSERT ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.gen_codigo_reserva();
INSERT INTO public.reserva_codigos (reserva_id, codigo)
  SELECT id, lpad((floor(random() * 10000))::int::text, 4, '0') FROM public.reservas ON CONFLICT DO NOTHING;

-- El prestador completa ingresando el código que le dicta el cliente (máx. 5 intentos):
CREATE OR REPLACE FUNCTION public.completar_con_codigo(_reserva_id uuid, _codigo text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.reservas WHERE id = _reserva_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.prestadores WHERE id = r.prestador_id AND usuario_id = public.current_usuario_id()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF r.estado <> 'en_camino' THEN RAISE EXCEPTION 'La reserva debe estar "en camino" para completarla'; END IF;
  IF (SELECT intentos FROM public.reserva_codigos WHERE reserva_id = _reserva_id) >= 5 THEN
    RAISE EXCEPTION 'Demasiados intentos. Pide al cliente que confirme desde su app.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reserva_codigos WHERE reserva_id = _reserva_id AND codigo = _codigo) THEN
    UPDATE public.reserva_codigos SET intentos = intentos + 1 WHERE reserva_id = _reserva_id;
    RETURN false;
  END IF;
  UPDATE public.reservas SET estado = 'completada', completada_at = now() WHERE id = _reserva_id;
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.completar_con_codigo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.completar_con_codigo(uuid, text) TO authenticated;

-- Permitir completar sin código solo desde esta función: el trigger de transiciones
-- ya exige pago; aquí bloqueamos en_camino→completada directo por el prestador.
CREATE OR REPLACE FUNCTION public.validar_transicion_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.current_usuario_id(); v_es_prestador boolean; v_pagado boolean;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id OR NEW.prestador_id IS DISTINCT FROM OLD.prestador_id
     OR NEW.servicio_id IS DISTINCT FROM OLD.servicio_id THEN
    RAISE EXCEPTION 'No autorizado: no se puede reasignar la reserva';
  END IF;
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN RETURN NEW; END IF;

  SELECT EXISTS (SELECT 1 FROM public.prestadores WHERE id = OLD.prestador_id AND usuario_id = v_me) INTO v_es_prestador;
  SELECT EXISTS (SELECT 1 FROM public.pagos WHERE reserva_id = OLD.id AND estado = 'pagado') INTO v_pagado;

  IF v_es_prestador THEN
    IF NEW.estado = 'cancelada' AND OLD.estado IN ('pendiente','confirmada') THEN
      NEW.cancelada_por := 'prestador'; RETURN NEW;
    END IF;
    IF NOT v_pagado THEN RAISE EXCEPTION 'La reserva aún no está pagada'; END IF;
    IF (OLD.estado, NEW.estado) IN (('pendiente'::reserva_estado,'confirmada'::reserva_estado),
                                    ('confirmada'::reserva_estado,'en_camino'::reserva_estado)) THEN
      RETURN NEW;
    END IF;
    IF NEW.estado = 'completada' THEN
      RAISE EXCEPTION 'Pide al cliente el código de confirmación para completar';
    END IF;
  ELSIF OLD.cliente_id = v_me THEN
    IF NEW.estado = 'cancelada' AND OLD.estado IN ('pendiente','confirmada') THEN
      NEW.cancelada_por := 'cliente'; RETURN NEW;
    END IF;
    IF NEW.estado = 'completada' AND OLD.estado = 'en_camino' AND v_pagado THEN
      NEW.completada_at := now(); RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Cambio de estado no permitido (% → %)', OLD.estado, NEW.estado;
END; $$;

-- 4) Geolocalización: índice para búsquedas por cercanía + función de distancia
CREATE INDEX IF NOT EXISTS idx_prestadores_latlng ON public.prestadores(lat, lng);
CREATE OR REPLACE FUNCTION public.distancia_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
    ELSE round((6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) * sin(radians(lat2))
    ))))::numeric, 1) END;
$$;
GRANT EXECUTE ON FUNCTION public.distancia_km(numeric, numeric, numeric, numeric) TO anon, authenticated;

-- 5) Liquidaciones a profesionales (pago manual semanal desde el panel de admin)
CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  monto integer NOT NULL CHECK (monto >= 0),
  reservas uuid[] NOT NULL DEFAULT '{}',
  medio text,            -- transferencia, mercado pago, etc.
  referencia text,       -- nº de comprobante
  nota text,
  pagada_at timestamptz NOT NULL DEFAULT now(),
  pagada_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin gestiona liquidaciones" ON public.liquidaciones;
CREATE POLICY "admin gestiona liquidaciones" ON public.liquidaciones FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "prestador lee sus liquidaciones" ON public.liquidaciones;
CREATE POLICY "prestador lee sus liquidaciones" ON public.liquidaciones FOR SELECT TO authenticated
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()));

ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS liquidacion_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS reembolsado_at timestamptz;

-- Datos bancarios del profesional para la liquidación (privados)
ALTER TABLE public.prestador_contacto
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS tipo_cuenta text,
  ADD COLUMN IF NOT EXISTS numero_cuenta text,
  ADD COLUMN IF NOT EXISTS rut text,
  ADD COLUMN IF NOT EXISTS titular text;

-- Saldo pendiente por profesional: reservas COMPLETADAS, pagadas, aún no liquidadas
CREATE OR REPLACE VIEW public.saldos_prestadores AS
  SELECT p.id AS prestador_id, p.nombre, p.usuario_id,
         COUNT(pg.id)::int AS reservas_pendientes,
         COALESCE(SUM(pg.monto_prestador), 0)::int AS monto_pendiente,
         COALESCE(SUM(pg.comision), 0)::int AS comision_homie,
         array_agg(r.id) FILTER (WHERE r.id IS NOT NULL) AS reserva_ids
    FROM public.prestadores p
    JOIN public.reservas r ON r.prestador_id = p.id AND r.estado = 'completada'
    JOIN public.pagos pg ON pg.reserva_id = r.id AND pg.estado = 'pagado' AND pg.liquidacion_id IS NULL
   GROUP BY p.id, p.nombre, p.usuario_id;
GRANT SELECT ON public.saldos_prestadores TO authenticated;

-- Registrar liquidación: crea el registro y marca los pagos como liquidados (atómico)
CREATE OR REPLACE FUNCTION public.registrar_liquidacion(_prestador_id uuid, _medio text, _referencia text, _nota text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids uuid[]; v_monto int; v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo administradores'; END IF;
  SELECT array_agg(r.id), COALESCE(SUM(pg.monto_prestador),0)::int INTO v_ids, v_monto
    FROM public.reservas r JOIN public.pagos pg ON pg.reserva_id = r.id
   WHERE r.prestador_id = _prestador_id AND r.estado = 'completada' AND pg.estado = 'pagado' AND pg.liquidacion_id IS NULL;
  IF v_ids IS NULL THEN RAISE EXCEPTION 'No hay montos pendientes'; END IF;
  INSERT INTO public.liquidaciones (prestador_id, monto, reservas, medio, referencia, nota, pagada_por)
  VALUES (_prestador_id, v_monto, v_ids, _medio, _referencia, _nota, auth.uid()) RETURNING id INTO v_id;
  UPDATE public.pagos SET liquidacion_id = v_id WHERE reserva_id = ANY(v_ids) AND estado = 'pagado';
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT usuario_id, 'liquidacion', 'Te pagamos tu liquidación', 'Homie te transfirió $' || to_char(v_monto, 'FM999G999G999') || ' por ' || cardinality(v_ids) || ' servicio(s).'
    FROM public.prestadores WHERE id = _prestador_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.registrar_liquidacion(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_liquidacion(uuid, text, text, text) TO authenticated;

-- 6) Resumen para el panel de administración
CREATE OR REPLACE FUNCTION public.admin_resumen()
RETURNS TABLE (
  reservas_hoy int, reservas_pendientes int, reservas_mes int, ingresos_mes int, comision_mes int,
  por_liquidar int, verificaciones_pendientes int, reclamos_abiertos int, prestadores_verificados int, clientes int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.reservas WHERE fecha = CURRENT_DATE AND estado IN ('confirmada','en_camino')),
    (SELECT COUNT(*)::int FROM public.reservas WHERE estado = 'pendiente'),
    (SELECT COUNT(*)::int FROM public.reservas WHERE created_at >= date_trunc('month', now())),
    (SELECT COALESCE(SUM(monto_total),0)::int FROM public.pagos WHERE estado = 'pagado' AND created_at >= date_trunc('month', now())),
    (SELECT COALESCE(SUM(comision),0)::int FROM public.pagos WHERE estado = 'pagado' AND created_at >= date_trunc('month', now())),
    (SELECT COALESCE(SUM(monto_pendiente),0)::int FROM public.saldos_prestadores),
    (SELECT COUNT(*)::int FROM public.verificaciones_prestador WHERE estado = 'pendiente'),
    (SELECT COUNT(*)::int FROM public.reclamos WHERE estado IN ('abierto','en_revision')),
    (SELECT COUNT(*)::int FROM public.prestadores WHERE verificado = true AND suspendido = false),
    (SELECT COUNT(*)::int FROM public.usuarios WHERE tipo = 'cliente')
  WHERE public.is_admin();
$$;
GRANT EXECUTE ON FUNCTION public.admin_resumen() TO authenticated;
