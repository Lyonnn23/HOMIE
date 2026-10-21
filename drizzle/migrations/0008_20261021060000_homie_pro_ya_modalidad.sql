-- Homie Pro, Homie Ya y modalidades. Los precios de planes se insertan por la herramienta de datos.
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS pro_hasta timestamptz,
  ADD COLUMN IF NOT EXISTS pro_trial_usado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.es_pro(_prestador_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT pro_hasta > now() FROM public.prestadores WHERE id = _prestador_id), false);
$$;
GRANT EXECUTE ON FUNCTION public.es_pro(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.tasa_comision(_prestador_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.es_pro(_prestador_id) THEN 0.12 ELSE 0.15 END;
$$;
GRANT EXECUTE ON FUNCTION public.tasa_comision(uuid) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.planes_pro (
  id text PRIMARY KEY, nombre text NOT NULL, precio integer NOT NULL, dias integer NOT NULL, activo boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.planes_pro TO anon, authenticated;
GRANT ALL ON public.planes_pro TO service_role;
ALTER TABLE public.planes_pro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planes publicos" ON public.planes_pro;
CREATE POLICY "planes publicos" ON public.planes_pro FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.suscripciones_pro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.planes_pro(id),
  monto integer NOT NULL,
  mp_preference_id text,
  mp_payment_id text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada','rechazada','prueba')),
  periodo_desde timestamptz,
  periodo_hasta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.suscripciones_pro TO authenticated;
GRANT ALL ON public.suscripciones_pro TO service_role;
ALTER TABLE public.suscripciones_pro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prestador lee sus suscripciones" ON public.suscripciones_pro;
CREATE POLICY "prestador lee sus suscripciones" ON public.suscripciones_pro FOR SELECT TO authenticated
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.activar_prueba_pro()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_hasta timestamptz;
BEGIN
  SELECT * INTO p FROM public.prestadores WHERE usuario_id = public.current_usuario_id();
  IF p IS NULL THEN RAISE EXCEPTION 'No tienes perfil de profesional'; END IF;
  IF NOT p.verificado THEN RAISE EXCEPTION 'La prueba gratis se activa cuando tu perfil está verificado'; END IF;
  IF p.pro_trial_usado THEN RAISE EXCEPTION 'Ya usaste tu prueba gratis'; END IF;
  v_hasta := GREATEST(COALESCE(p.pro_hasta, now()), now()) + interval '30 days';
  UPDATE public.prestadores SET pro_hasta = v_hasta, pro_trial_usado = true, plan = 'pro' WHERE id = p.id;
  INSERT INTO public.suscripciones_pro (prestador_id, plan_id, monto, estado, periodo_desde, periodo_hasta)
  VALUES (p.id, 'mensual', 0, 'prueba', now(), v_hasta);
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  VALUES (p.usuario_id, 'pro', '¡Homie Pro activado!', 'Tienes 30 días gratis: comisión 12%, perfil destacado y estadísticas.');
  RETURN v_hasta;
END; $$;
REVOKE EXECUTE ON FUNCTION public.activar_prueba_pro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activar_prueba_pro() TO authenticated;

CREATE OR REPLACE FUNCTION public.activar_pro_pagado(_suscripcion_id uuid, _mp_payment_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; v_dias int; v_desde timestamptz; v_hasta timestamptz;
BEGIN
  SELECT * INTO s FROM public.suscripciones_pro WHERE id = _suscripcion_id;
  IF s IS NULL OR s.estado = 'pagada' THEN RETURN; END IF;
  SELECT dias INTO v_dias FROM public.planes_pro WHERE id = s.plan_id;
  SELECT GREATEST(COALESCE(pro_hasta, now()), now()) INTO v_desde FROM public.prestadores WHERE id = s.prestador_id;
  v_hasta := v_desde + make_interval(days => v_dias);
  UPDATE public.suscripciones_pro SET estado = 'pagada', mp_payment_id = _mp_payment_id, periodo_desde = v_desde, periodo_hasta = v_hasta WHERE id = s.id;
  UPDATE public.prestadores SET pro_hasta = v_hasta, plan = 'pro' WHERE id = s.prestador_id;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT usuario_id, 'pro', 'Homie Pro renovado', 'Tu plan Pro está activo hasta el ' || to_char(v_hasta, 'DD/MM/YYYY') || '.'
    FROM public.prestadores WHERE id = s.prestador_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.activar_pro_pagado(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activar_pro_pagado(uuid, text) TO service_role;

ALTER TABLE public.prestadores ADD COLUMN IF NOT EXISTS vistas integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.stats_prestador(_prestador_id uuid)
RETURNS TABLE (
  servicios_completados int, ingresos_total int, ingresos_mes int, reservas_mes int,
  tasa_aceptacion numeric, calificacion numeric, resenas int, cotizaciones_enviadas int, cotizaciones_ganadas int, vistas_perfil int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.reservas WHERE prestador_id = _prestador_id AND estado = 'completada'),
    (SELECT COALESCE(SUM(pg.monto_prestador),0)::int FROM public.pagos pg JOIN public.reservas r ON r.id = pg.reserva_id WHERE r.prestador_id = _prestador_id AND pg.estado = 'pagado' AND r.estado = 'completada'),
    (SELECT COALESCE(SUM(pg.monto_prestador),0)::int FROM public.pagos pg JOIN public.reservas r ON r.id = pg.reserva_id WHERE r.prestador_id = _prestador_id AND pg.estado = 'pagado' AND r.estado = 'completada' AND r.completada_at >= date_trunc('month', now())),
    (SELECT COUNT(*)::int FROM public.reservas WHERE prestador_id = _prestador_id AND created_at >= date_trunc('month', now())),
    (SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE estado <> 'cancelada' OR cancelada_por <> 'prestador') / COUNT(*), 0) END
       FROM public.reservas WHERE prestador_id = _prestador_id),
    (SELECT calificacion_promedio FROM public.prestadores WHERE id = _prestador_id),
    (SELECT resenas_count FROM public.prestadores WHERE id = _prestador_id),
    (SELECT COUNT(*)::int FROM public.cotizaciones WHERE prestador_id = _prestador_id),
    (SELECT COUNT(*)::int FROM public.cotizaciones WHERE prestador_id = _prestador_id AND estado = 'aceptada'),
    (SELECT COALESCE(vistas, 0) FROM public.prestadores WHERE id = _prestador_id)
  WHERE public.is_admin() OR EXISTS (SELECT 1 FROM public.prestadores WHERE id = _prestador_id AND usuario_id = public.current_usuario_id());
$$;
GRANT EXECUTE ON FUNCTION public.stats_prestador(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_vista(_prestador_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.prestadores SET vistas = vistas + 1 WHERE id = _prestador_id;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_vista(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fill_reserva_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_precio integer; v_tasa numeric;
BEGIN
  IF NEW.nota LIKE 'Cotización aceptada:%' AND auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.nota LIKE 'Homie Ya:%' AND auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.total IS NOT DISTINCT FROM OLD.total
     AND NEW.servicio_id IS NOT DISTINCT FROM OLD.servicio_id AND NEW.prestador_id IS NOT DISTINCT FROM OLD.prestador_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.nota LIKE 'Cotización aceptada:%' OR OLD.nota LIKE 'Homie Ya:%') THEN
    NEW.total := OLD.total; NEW.comision := OLD.comision; RETURN NEW;
  END IF;
  IF NEW.servicio_id IS NOT NULL THEN
    SELECT precio INTO v_precio FROM public.prestador_servicios
     WHERE prestador_id = NEW.prestador_id AND servicio_id = NEW.servicio_id LIMIT 1;
  END IF;
  IF v_precio IS NOT NULL THEN
    v_tasa := public.tasa_comision(NEW.prestador_id);
    NEW.comision := ROUND(v_precio * v_tasa);
    NEW.total := v_precio + NEW.comision;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.aceptar_cotizacion(_cotizacion_id uuid, _fecha date, _hora time, _direccion text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; s record; v_reserva uuid; v_servicio uuid; v_tasa numeric;
BEGIN
  SELECT * INTO c FROM public.cotizaciones WHERE id = _cotizacion_id;
  IF c IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  SELECT * INTO s FROM public.solicitudes WHERE id = c.solicitud_id;
  IF s.cliente_id IS DISTINCT FROM public.current_usuario_id() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF s.estado <> 'abierta' THEN RAISE EXCEPTION 'La solicitud ya no está abierta'; END IF;
  IF c.estado <> 'enviada' THEN RAISE EXCEPTION 'La cotización ya no está disponible'; END IF;
  v_servicio := s.servicio_id;
  IF v_servicio IS NULL OR NOT EXISTS (SELECT 1 FROM public.prestador_servicios WHERE prestador_id = c.prestador_id AND servicio_id = v_servicio) THEN
    SELECT ps.servicio_id INTO v_servicio FROM public.prestador_servicios ps WHERE ps.prestador_id = c.prestador_id LIMIT 1;
  END IF;
  v_tasa := public.tasa_comision(c.prestador_id);
  INSERT INTO public.reservas (cliente_id, prestador_id, servicio_id, fecha, hora, direccion, nota, total, comision, estado)
  VALUES (s.cliente_id, c.prestador_id, v_servicio, _fecha, _hora, COALESCE(_direccion, s.direccion, ''),
          'Cotización aceptada: ' || left(s.titulo, 80), c.precio + ROUND(c.precio * v_tasa), ROUND(c.precio * v_tasa), 'pendiente')
  RETURNING id INTO v_reserva;
  UPDATE public.cotizaciones SET estado = 'aceptada' WHERE id = c.id;
  UPDATE public.cotizaciones SET estado = 'rechazada' WHERE solicitud_id = s.id AND id <> c.id AND estado = 'enviada';
  UPDATE public.solicitudes SET estado = 'adjudicada', cotizacion_aceptada_id = c.id WHERE id = s.id;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  SELECT p.usuario_id, 'cotizacion', '¡Tu cotización fue aceptada!', 'El cliente aceptó tu cotización por ' || s.titulo || '. Revisa la reserva.', v_reserva
    FROM public.prestadores p WHERE p.id = c.prestador_id;
  RETURN v_reserva;
END; $$;

ALTER TABLE public.prestador_servicios
  ADD COLUMN IF NOT EXISTS modalidades text[] NOT NULL DEFAULT '{domicilio}';
ALTER TABLE public.prestador_servicios DROP CONSTRAINT IF EXISTS prestador_servicios_modalidades_chk;
ALTER TABLE public.prestador_servicios ADD CONSTRAINT prestador_servicios_modalidades_chk
  CHECK (modalidades <@ ARRAY['domicilio','online','local']::text[] AND cardinality(modalidades) >= 1);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'domicilio'
  CHECK (modalidad IN ('domicilio','online','local'));

CREATE TABLE IF NOT EXISTS public.urgencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  categoria_id text NOT NULL REFERENCES public.categorias(id),
  servicio_id uuid REFERENCES public.servicios(id),
  descripcion text NOT NULL CHECK (char_length(descripcion) BETWEEN 5 AND 500),
  direccion text NOT NULL,
  lat numeric(9,6), lng numeric(9,6),
  telefono text,
  estado text NOT NULL DEFAULT 'buscando' CHECK (estado IN ('buscando','asignada','cancelada','expirada')),
  prestador_id uuid REFERENCES public.prestadores(id),
  reserva_id uuid REFERENCES public.reservas(id),
  eta_min integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expira_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);
GRANT SELECT, INSERT, UPDATE ON public.urgencias TO authenticated;
GRANT ALL ON public.urgencias TO service_role;
CREATE INDEX IF NOT EXISTS idx_urgencias_estado ON public.urgencias(estado, categoria_id);
ALTER TABLE public.urgencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cliente crea urgencia" ON public.urgencias;
CREATE POLICY "cliente crea urgencia" ON public.urgencias FOR INSERT TO authenticated
  WITH CHECK (cliente_id = public.current_usuario_id());
DROP POLICY IF EXISTS "cliente actualiza urgencia" ON public.urgencias;
CREATE POLICY "cliente actualiza urgencia" ON public.urgencias FOR UPDATE TO authenticated
  USING (cliente_id = public.current_usuario_id()) WITH CHECK (cliente_id = public.current_usuario_id());
DROP POLICY IF EXISTS "lee urgencias" ON public.urgencias;
CREATE POLICY "lee urgencias" ON public.urgencias FOR SELECT TO authenticated
  USING (
    cliente_id = public.current_usuario_id() OR public.is_admin()
    OR prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id())
    OR (estado = 'buscando' AND expira_at > now() AND categoria_id IN (
         SELECT categoria_id FROM public.prestadores
          WHERE usuario_id = public.current_usuario_id() AND verificado = true AND suspendido = false AND disponible_ahora = true))
  );

CREATE OR REPLACE FUNCTION public.notify_urgencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT p.usuario_id, 'urgencia', '🚨 Homie Ya: urgencia cerca de ti',
         left(NEW.descripcion, 90) || ' — el primero en aceptar se la queda.'
    FROM public.prestadores p
   WHERE p.categoria_id = NEW.categoria_id AND p.verificado = true AND p.suspendido = false AND p.disponible_ahora = true
     AND (NEW.lat IS NULL OR p.lat IS NULL OR public.distancia_km(NEW.lat, NEW.lng, p.lat, p.lng) <= 20);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_urgencia ON public.urgencias;
CREATE TRIGGER trg_notify_urgencia AFTER INSERT ON public.urgencias FOR EACH ROW EXECUTE FUNCTION public.notify_urgencia();

CREATE OR REPLACE FUNCTION public.aceptar_urgencia(_urgencia_id uuid, _eta_min integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record; p record; v_servicio uuid; v_precio int; v_tasa numeric; v_reserva uuid; v_hora time;
BEGIN
  SELECT * INTO p FROM public.prestadores WHERE usuario_id = public.current_usuario_id() AND verificado = true AND suspendido = false;
  IF p IS NULL THEN RAISE EXCEPTION 'Solo profesionales verificados pueden aceptar urgencias'; END IF;
  SELECT * INTO u FROM public.urgencias WHERE id = _urgencia_id FOR UPDATE;
  IF u IS NULL THEN RAISE EXCEPTION 'Urgencia no encontrada'; END IF;
  IF u.estado <> 'buscando' OR u.expira_at < now() THEN RAISE EXCEPTION 'Otro profesional ya tomó esta urgencia'; END IF;
  IF u.categoria_id <> p.categoria_id THEN RAISE EXCEPTION 'La urgencia no es de tu rubro'; END IF;
  v_servicio := u.servicio_id;
  IF v_servicio IS NULL OR NOT EXISTS (SELECT 1 FROM public.prestador_servicios WHERE prestador_id = p.id AND servicio_id = v_servicio) THEN
    SELECT servicio_id INTO v_servicio FROM public.prestador_servicios WHERE prestador_id = p.id ORDER BY precio LIMIT 1;
  END IF;
  SELECT precio INTO v_precio FROM public.prestador_servicios WHERE prestador_id = p.id AND servicio_id = v_servicio;
  IF v_precio IS NULL THEN RAISE EXCEPTION 'No tienes servicios publicados'; END IF;
  v_tasa := public.tasa_comision(p.id);
  v_hora := date_trunc('hour', (now() AT TIME ZONE 'America/Santiago') + make_interval(mins => COALESCE(_eta_min, 30)))::time;
  INSERT INTO public.reservas (cliente_id, prestador_id, servicio_id, fecha, hora, direccion, nota, total, comision, estado)
  VALUES (u.cliente_id, p.id, v_servicio, (now() AT TIME ZONE 'America/Santiago')::date, v_hora, u.direccion,
          'Homie Ya: ' || left(u.descripcion, 80), v_precio + ROUND(v_precio * v_tasa), ROUND(v_precio * v_tasa), 'pendiente')
  RETURNING id INTO v_reserva;
  UPDATE public.urgencias SET estado = 'asignada', prestador_id = p.id, reserva_id = v_reserva, eta_min = _eta_min WHERE id = u.id;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  VALUES (u.cliente_id, 'urgencia', '¡Un profesional va en camino!', COALESCE(p.nombre, 'Un profesional') || ' aceptó tu urgencia y llega en ~' || COALESCE(_eta_min, 30) || ' min. Paga ahora para confirmar.', v_reserva);
  RETURN v_reserva;
END; $$;
REVOKE EXECUTE ON FUNCTION public.aceptar_urgencia(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceptar_urgencia(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_agenda_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_h jsonb; v_dia text; v_cfg jsonb; v_desde time; v_hasta time;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.nota LIKE 'Homie Ya:%' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.fecha = OLD.fecha AND NEW.hora = OLD.hora AND NEW.prestador_id = OLD.prestador_id THEN RETURN NEW; END IF;
  IF NEW.fecha < CURRENT_DATE THEN RAISE EXCEPTION 'La fecha ya pasó'; END IF;
  SELECT horario INTO v_h FROM public.prestadores WHERE id = NEW.prestador_id;
  v_dia := (ARRAY['dom','lun','mar','mie','jue','vie','sab'])[EXTRACT(DOW FROM NEW.fecha)::int + 1];
  v_cfg := v_h -> v_dia;
  IF v_cfg IS NOT NULL THEN
    IF COALESCE((v_cfg->>'activo')::boolean, true) = false THEN RAISE EXCEPTION 'El profesional no atiende ese día'; END IF;
    v_desde := (v_cfg->>'desde')::time; v_hasta := (v_cfg->>'hasta')::time;
    IF v_desde IS NOT NULL AND v_hasta IS NOT NULL AND (NEW.hora < v_desde OR NEW.hora >= v_hasta) THEN
      RAISE EXCEPTION 'Hora fuera del horario de atención (% a %)', to_char(v_desde,'HH24:MI'), to_char(v_hasta,'HH24:MI');
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservas r WHERE r.prestador_id = NEW.prestador_id AND r.fecha = NEW.fecha
              AND r.id IS DISTINCT FROM NEW.id AND r.estado IN ('pendiente','confirmada','en_camino')
              AND abs(EXTRACT(EPOCH FROM (r.hora - NEW.hora))) < 3600) THEN
    RAISE EXCEPTION 'Esa hora ya está reservada. Elige otra.';
  END IF;
  RETURN NEW;
END; $$;