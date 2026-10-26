-- ============================================================
-- Modelo de cobro: gratis 3 meses por profesional (0% comisión desde la
-- verificación), luego 15% (12% con Premium). Premium = membresía opcional
-- con 3 meses gratis. Ranking por reputación, Premium solo empuja si es bueno.
-- ============================================================

-- Configuración pública editable sin tocar código
CREATE TABLE IF NOT EXISTS public.config_publica (
  clave text PRIMARY KEY,
  valor numeric NOT NULL,
  descripcion text
);
ALTER TABLE public.config_publica ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "config publica lectura" ON public.config_publica;
CREATE POLICY "config publica lectura" ON public.config_publica FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin edita config" ON public.config_publica;
CREATE POLICY "admin edita config" ON public.config_publica FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.config_publica (clave, valor, descripcion) VALUES
  ('comision_normal', 0.15, 'Tarifa de servicio normal (fracción)'),
  ('comision_premium', 0.12, 'Tarifa de servicio con Premium (fracción)'),
  ('comision_gratis', 0.00, 'Tarifa durante el periodo gratis. Mercado Pago cobra ~3.5%: 0.04 cubre ese costo'),
  ('dias_gratis', 90, 'Días sin comisión desde la verificación'),
  ('premium_trial_dias', 90, 'Días gratis de Premium para nuevos verificados'),
  ('ranking_min_rating_premium', 4.0, 'Calificación mínima para que Premium empuje en el ranking'),
  ('ranking_min_resenas_premium', 3, 'Reseñas mínimas para que Premium empuje en el ranking')
ON CONFLICT (clave) DO NOTHING;

CREATE OR REPLACE FUNCTION public.cfg(_clave text, _default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT valor FROM public.config_publica WHERE clave = _clave), _default);
$$;
GRANT EXECUTE ON FUNCTION public.cfg(text, numeric) TO anon, authenticated;

-- Fecha de verificación y fin del periodo gratis
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS verificado_at timestamptz,
  ADD COLUMN IF NOT EXISTS comision_gratis_hasta timestamptz;

CREATE OR REPLACE FUNCTION public.al_verificar_prestador()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dias int := public.cfg('dias_gratis', 90)::int; v_trial int := public.cfg('premium_trial_dias', 90)::int;
BEGIN
  IF NEW.verificado = true AND (OLD.verificado IS DISTINCT FROM true) THEN
    NEW.verificado_at := COALESCE(NEW.verificado_at, now());
    NEW.comision_gratis_hasta := COALESCE(NEW.comision_gratis_hasta, now() + make_interval(days => v_dias));
    -- Premium gratis el mismo periodo (sin consumir la prueba si ya la usó)
    IF NEW.pro_hasta IS NULL OR NEW.pro_hasta < now() THEN
      NEW.pro_hasta := now() + make_interval(days => v_trial);
      NEW.pro_trial_usado := true;
      NEW.plan := 'pro';
    END IF;
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    VALUES (NEW.usuario_id, 'pro', '¡Perfil verificado! 3 meses gratis',
            'Sin comisión hasta el ' || to_char(NEW.comision_gratis_hasta, 'DD/MM/YYYY') || ' y Homie Premium incluido. Ya apareces en las búsquedas.');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_al_verificar_prestador ON public.prestadores;
CREATE TRIGGER trg_al_verificar_prestador BEFORE UPDATE OF verificado ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.al_verificar_prestador();

-- Profesionales ya verificados antes de este cambio: también reciben los 3 meses
UPDATE public.prestadores
   SET verificado_at = COALESCE(verificado_at, now()),
       comision_gratis_hasta = COALESCE(comision_gratis_hasta, now() + make_interval(days => public.cfg('dias_gratis', 90)::int)),
       pro_hasta = GREATEST(COALESCE(pro_hasta, now()), now() + make_interval(days => public.cfg('premium_trial_dias', 90)::int)),
       pro_trial_usado = true, plan = 'pro'
 WHERE verificado = true;

-- Tarifa de servicio según periodo gratis / Premium
CREATE OR REPLACE FUNCTION public.tasa_comision(_prestador_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN (SELECT comision_gratis_hasta > now() FROM public.prestadores WHERE id = _prestador_id) THEN public.cfg('comision_gratis', 0)
    WHEN public.es_pro(_prestador_id) THEN public.cfg('comision_premium', 0.12)
    ELSE public.cfg('comision_normal', 0.15) END;
$$;

-- La prueba Premium manual pasa a los días configurados
CREATE OR REPLACE FUNCTION public.activar_prueba_pro()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_hasta timestamptz; v_trial int := public.cfg('premium_trial_dias', 90)::int;
BEGIN
  SELECT * INTO p FROM public.prestadores WHERE usuario_id = public.current_usuario_id();
  IF p IS NULL THEN RAISE EXCEPTION 'No tienes perfil de profesional'; END IF;
  IF NOT p.verificado THEN RAISE EXCEPTION 'La prueba gratis se activa cuando tu perfil está verificado'; END IF;
  IF p.pro_trial_usado THEN RAISE EXCEPTION 'Ya usaste tu prueba gratis'; END IF;
  v_hasta := GREATEST(COALESCE(p.pro_hasta, now()), now()) + make_interval(days => v_trial);
  UPDATE public.prestadores SET pro_hasta = v_hasta, pro_trial_usado = true, plan = 'pro' WHERE id = p.id;
  INSERT INTO public.suscripciones_pro (prestador_id, plan_id, monto, estado, periodo_desde, periodo_hasta)
  VALUES (p.id, 'mensual', 0, 'prueba', now(), v_hasta);
  RETURN v_hasta;
END; $$;

UPDATE public.planes_pro SET nombre = 'Homie Premium mensual' WHERE id = 'mensual';
UPDATE public.planes_pro SET nombre = 'Homie Premium anual' WHERE id = 'anual';

-- Ranking por reputación (misma fórmula que usa la app). Premium empuja solo si es bueno.
CREATE OR REPLACE FUNCTION public.puntaje_ranking(_prestador_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v numeric := 0; v_completadas int; v_canceladas int; v_total int;
BEGIN
  SELECT * INTO p FROM public.prestadores WHERE id = _prestador_id;
  IF p IS NULL THEN RETURN 0; END IF;
  SELECT COUNT(*) FILTER (WHERE estado = 'completada'), COUNT(*) FILTER (WHERE estado = 'cancelada' AND cancelada_por = 'prestador'), COUNT(*)
    INTO v_completadas, v_canceladas, v_total FROM public.reservas WHERE prestador_id = p.id;
  -- Calificación ponderada (bayesiana): pocas reseñas se acercan a 4.5
  v := ((p.calificacion_promedio * p.resenas_count) + (4.5 * 5)) / (p.resenas_count + 5) * 20;    -- 0..100
  v := v + LEAST(v_completadas, 50) * 0.4;                                                       -- hasta +20
  v := v - LEAST(v_canceladas, 10) * 3;                                                          -- hasta -30
  IF p.disponible_ahora THEN v := v + 8; END IF;
  IF p.disponibilidad_texto LIKE '%15 min%' THEN v := v + 4; ELSIF p.disponibilidad_texto LIKE '%1 h%' THEN v := v + 2; END IF;
  IF p.pro_hasta > now() AND p.calificacion_promedio >= public.cfg('ranking_min_rating_premium', 4.0)
     AND p.resenas_count >= public.cfg('ranking_min_resenas_premium', 3)::int THEN
    v := v + 12;
  END IF;
  RETURN ROUND(v, 2);
END; $$;
GRANT EXECUTE ON FUNCTION public.puntaje_ranking(uuid) TO anon, authenticated;

-- ============================================================
-- Modelo definitivo: el CLIENTE paga exactamente el precio del profesional (sin
-- recargo). La comisión de Homie se descuenta del pago al profesional.
-- reservas.total = precio - descuento (lo que paga el cliente); reservas.comision = precio * tasa.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fill_reserva_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_precio integer; v_tasa numeric;
BEGIN
  IF (NEW.nota LIKE 'Cotización aceptada:%' OR NEW.nota LIKE 'Homie Ya:%') AND auth.uid() IS NULL THEN RETURN NEW; END IF;
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
    NEW.total := v_precio;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.aplicar_cupon_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  IF NEW.cupon_codigo IS NULL OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v FROM public.validar_cupon(NEW.cupon_codigo, NEW.total);
  IF NOT v.valido THEN RAISE EXCEPTION '%', v.mensaje; END IF;
  NEW.descuento := v.descuento;
  NEW.total := GREATEST(NEW.total - v.descuento, 0);
  NEW.cupon_codigo := upper(trim(NEW.cupon_codigo));
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
          'Cotización aceptada: ' || left(s.titulo, 80), c.precio, ROUND(c.precio * v_tasa), 'pendiente')
  RETURNING id INTO v_reserva;
  UPDATE public.cotizaciones SET estado = 'aceptada' WHERE id = c.id;
  UPDATE public.cotizaciones SET estado = 'rechazada' WHERE solicitud_id = s.id AND id <> c.id AND estado = 'enviada';
  UPDATE public.solicitudes SET estado = 'adjudicada', cotizacion_aceptada_id = c.id WHERE id = s.id;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  SELECT p.usuario_id, 'cotizacion', '¡Tu cotización fue aceptada!', 'El cliente aceptó tu cotización por ' || s.titulo || '. Revisa la reserva.', v_reserva
    FROM public.prestadores p WHERE p.id = c.prestador_id;
  RETURN v_reserva;
END; $$;

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
          'Homie Ya: ' || left(u.descripcion, 80), v_precio, ROUND(v_precio * v_tasa), 'pendiente')
  RETURNING id INTO v_reserva;
  UPDATE public.urgencias SET estado = 'asignada', prestador_id = p.id, reserva_id = v_reserva, eta_min = _eta_min WHERE id = u.id;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  VALUES (u.cliente_id, 'urgencia', '¡Un profesional va en camino!', COALESCE(p.nombre, 'Un profesional') || ' aceptó tu urgencia y llega en ~' || COALESCE(_eta_min, 30) || ' min. Paga ahora para confirmar.', v_reserva);
  RETURN v_reserva;
END; $$;

-- Reservas pendientes de pago existentes: recalcular al nuevo modelo
UPDATE public.reservas r SET total = (SELECT precio FROM public.prestador_servicios ps WHERE ps.prestador_id = r.prestador_id AND ps.servicio_id = r.servicio_id) - r.descuento,
                            comision = ROUND((SELECT precio FROM public.prestador_servicios ps WHERE ps.prestador_id = r.prestador_id AND ps.servicio_id = r.servicio_id) * public.tasa_comision(r.prestador_id))
 WHERE r.estado = 'pendiente' AND r.servicio_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.pagos p WHERE p.reserva_id = r.id AND p.estado = 'pagado');

-- Un cupón puede superar la comisión (Homie lo absorbe): la comisión neta del pago puede ser negativa
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_comision_check;
