-- Explicit Data API access; policies continue to authorize edits server-side.
GRANT SELECT ON public.config_publica TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.config_publica TO authenticated;
GRANT ALL ON public.config_publica TO service_role;

-- Validate configuration bounds without time-dependent CHECK constraints.
CREATE OR REPLACE FUNCTION public.validar_config_cobros()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.valor < 0 OR NEW.valor::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Valor de configuración no válido'; END IF;
  IF NEW.clave IN ('comision_normal','comision_premium','comision_gratis') AND NEW.valor > 1 THEN RAISE EXCEPTION 'La comisión debe estar entre 0 y 1'; END IF;
  IF NEW.clave IN ('dias_gratis','premium_trial_dias','ranking_min_resenas_premium') AND NEW.valor <> trunc(NEW.valor) THEN RAISE EXCEPTION 'Se requiere un número entero'; END IF;
  IF NEW.clave = 'ranking_min_rating_premium' AND NEW.valor > 5 THEN RAISE EXCEPTION 'La calificación máxima es 5'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validar_config_cobros BEFORE INSERT OR UPDATE ON public.config_publica FOR EACH ROW EXECUTE FUNCTION public.validar_config_cobros();

-- Run before any verification trigger so a forged verification cannot mint benefits.
CREATE OR REPLACE FUNCTION public.proteger_beneficios_premium()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.verificado_at IS NOT NULL OR NEW.comision_gratis_hasta IS NOT NULL OR NEW.pro_hasta IS NOT NULL
         OR NEW.pro_trial_usado OR NEW.verificado OR NEW.verificado_identidad OR NEW.antecedentes_ok
         OR NEW.suspendido OR NEW.plan IS DISTINCT FROM 'basico' THEN
        RAISE EXCEPTION 'No autorizado: verificación y beneficios protegidos';
      END IF;
    ELSE
      IF NEW.verificado_at IS DISTINCT FROM OLD.verificado_at OR NEW.comision_gratis_hasta IS DISTINCT FROM OLD.comision_gratis_hasta
         OR NEW.pro_hasta IS DISTINCT FROM OLD.pro_hasta OR NEW.pro_trial_usado IS DISTINCT FROM OLD.pro_trial_usado
         OR NEW.verificado IS DISTINCT FROM OLD.verificado THEN
        RAISE EXCEPTION 'No autorizado: verificación y beneficios protegidos';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_00_proteger_beneficios_premium BEFORE INSERT OR UPDATE ON public.prestadores
FOR EACH ROW EXECUTE FUNCTION public.proteger_beneficios_premium();

-- Keep coupon ownership and serialization while using the new no-surcharge basis.
CREATE OR REPLACE FUNCTION public.aplicar_cupon_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  NEW.descuento := 0;
  IF NEW.cupon_codigo IS NULL THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.cliente_id IS DISTINCT FROM public.current_usuario_id() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  PERFORM 1 FROM public.usuarios WHERE id = NEW.cliente_id FOR UPDATE;
  PERFORM 1 FROM public.cupones WHERE upper(codigo) = upper(trim(NEW.cupon_codigo)) FOR UPDATE;
  SELECT * INTO v FROM public.validar_cupon(NEW.cupon_codigo, NEW.total);
  IF NOT v.valido THEN RAISE EXCEPTION '%', v.mensaje; END IF;
  NEW.descuento := v.descuento;
  NEW.total := GREATEST(NEW.total - v.descuento, 0);
  SELECT codigo INTO NEW.cupon_codigo FROM public.cupones WHERE upper(codigo) = upper(trim(NEW.cupon_codigo));
  RETURN NEW;
END; $$;

-- An accepted quote gets its agreed price, not the provider's catalog price.
-- Only the authenticated, authorized quote routine sets this transaction-local id.
CREATE OR REPLACE FUNCTION public.fill_reserva_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_precio integer; v_tasa numeric;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.id::text = current_setting('homie.quote_reservation', true) THEN RETURN NEW; END IF;
  IF (NEW.nota LIKE 'Cotización aceptada:%' OR NEW.nota LIKE 'Homie Ya:%') AND auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.total IS NOT DISTINCT FROM OLD.total
     AND NEW.servicio_id IS NOT DISTINCT FROM OLD.servicio_id AND NEW.prestador_id IS NOT DISTINCT FROM OLD.prestador_id THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND (OLD.nota LIKE 'Cotización aceptada:%' OR OLD.nota LIKE 'Homie Ya:%') THEN
    NEW.total := OLD.total; NEW.comision := OLD.comision; RETURN NEW;
  END IF;
  IF NEW.servicio_id IS NOT NULL THEN
    SELECT precio INTO v_precio FROM public.prestador_servicios WHERE prestador_id = NEW.prestador_id AND servicio_id = NEW.servicio_id LIMIT 1;
  END IF;
  IF v_precio IS NOT NULL THEN
    v_tasa := public.tasa_comision(NEW.prestador_id);
    NEW.comision := ROUND(v_precio * v_tasa);
    NEW.total := v_precio;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.aceptar_cotizacion(_cotizacion_id uuid, _fecha date, _hora time, _direccion text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; s record; v_reserva uuid := gen_random_uuid(); v_servicio uuid; v_tasa numeric; v_previous text;
BEGIN
  IF public.current_usuario_id() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO s FROM public.solicitudes WHERE id = (SELECT solicitud_id FROM public.cotizaciones WHERE id = _cotizacion_id) FOR UPDATE;
  IF s IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF s.cliente_id IS DISTINCT FROM public.current_usuario_id() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO c FROM public.cotizaciones WHERE id = _cotizacion_id AND solicitud_id = s.id FOR UPDATE;
  IF c IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF s.estado <> 'abierta' THEN RAISE EXCEPTION 'La solicitud ya no está abierta'; END IF;
  IF c.estado <> 'enviada' THEN RAISE EXCEPTION 'La cotización ya no está disponible'; END IF;
  v_servicio := s.servicio_id;
  IF v_servicio IS NULL OR NOT EXISTS (SELECT 1 FROM public.prestador_servicios WHERE prestador_id = c.prestador_id AND servicio_id = v_servicio) THEN
    SELECT ps.servicio_id INTO v_servicio FROM public.prestador_servicios ps WHERE ps.prestador_id = c.prestador_id LIMIT 1;
  END IF;
  v_tasa := public.tasa_comision(c.prestador_id);
  v_previous := current_setting('homie.quote_reservation', true);
  PERFORM set_config('homie.quote_reservation', v_reserva::text, true);
  INSERT INTO public.reservas (id, cliente_id, prestador_id, servicio_id, fecha, hora, direccion, nota, total, comision, estado)
  VALUES (v_reserva, s.cliente_id, c.prestador_id, v_servicio, _fecha, _hora, COALESCE(_direccion, s.direccion, ''),
          'Cotización aceptada: ' || left(s.titulo, 80), c.precio, ROUND(c.precio * v_tasa), 'pendiente');
  PERFORM set_config('homie.quote_reservation', COALESCE(v_previous,''), true);
  UPDATE public.cotizaciones SET estado = 'aceptada' WHERE id = c.id;
  UPDATE public.cotizaciones SET estado = 'rechazada' WHERE solicitud_id = s.id AND id <> c.id AND estado = 'enviada';
  UPDATE public.solicitudes SET estado = 'adjudicada', cotizacion_aceptada_id = c.id WHERE id = s.id;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  SELECT p.usuario_id, 'cotizacion', '¡Tu cotización fue aceptada!', 'El cliente aceptó tu cotización por ' || s.titulo || '. Revisa la reserva.', v_reserva
  FROM public.prestadores p WHERE p.id = c.prestador_id;
  RETURN v_reserva;
END; $$;

-- Invoker trigger distinguishes direct client changes from validated definer routines.
CREATE OR REPLACE FUNCTION public.validar_cambio_cotizacion()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_me uuid := public.current_usuario_id();
BEGIN
  IF current_user NOT IN ('anon','authenticated') OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'retirada' AND EXISTS (SELECT 1 FROM public.prestadores WHERE id = OLD.prestador_id AND usuario_id = v_me) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Cambio de estado no permitido';
  END IF;
  RETURN NEW;
END; $$;

-- Claim the manual trial once under a row lock and retain authenticated-only access.
CREATE OR REPLACE FUNCTION public.activar_prueba_pro()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_hasta timestamptz; v_trial int := public.cfg('premium_trial_dias',90)::int;
BEGIN
  IF public.current_usuario_id() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO p FROM public.prestadores WHERE usuario_id = public.current_usuario_id() FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'No tienes perfil de profesional'; END IF;
  IF NOT p.verificado THEN RAISE EXCEPTION 'La prueba gratis se activa cuando tu perfil está verificado'; END IF;
  IF p.pro_trial_usado THEN RAISE EXCEPTION 'Ya usaste tu prueba gratis'; END IF;
  v_hasta := GREATEST(COALESCE(p.pro_hasta,now()),now()) + make_interval(days => v_trial);
  UPDATE public.prestadores SET pro_hasta=v_hasta,pro_trial_usado=true,plan='pro' WHERE id=p.id;
  INSERT INTO public.suscripciones_pro (prestador_id,plan_id,monto,estado,periodo_desde,periodo_hasta)
  VALUES (p.id,'mensual',0,'prueba',now(),v_hasta);
  RETURN v_hasta;
END; $$;
REVOKE ALL ON FUNCTION public.activar_prueba_pro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activar_prueba_pro() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.proteger_beneficios_premium(), public.validar_config_cobros() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proteger_beneficios_premium(), public.validar_config_cobros() TO service_role;