-- ============================================================
-- Solicitudes de cotización: el cliente publica lo que necesita (con fotos),
-- los profesionales verificados de esa categoría cotizan dentro de su rango,
-- y el cliente elige. Al aceptar se crea la reserva (con pago en la app).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  categoria_id text NOT NULL REFERENCES public.categorias(id),
  servicio_id uuid REFERENCES public.servicios(id),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 5 AND 120),
  detalle text NOT NULL CHECK (char_length(detalle) BETWEEN 20 AND 2000),
  fotos text[] NOT NULL DEFAULT '{}',
  comuna text,
  direccion text,
  fecha_deseada date,
  urgente boolean NOT NULL DEFAULT false,
  presupuesto_max integer CHECK (presupuesto_max IS NULL OR presupuesto_max >= 0),
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','adjudicada','cerrada','cancelada')),
  cotizacion_aceptada_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expira_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
GRANT SELECT, INSERT, UPDATE ON public.solicitudes TO authenticated;
GRANT ALL ON public.solicitudes TO service_role;
CREATE INDEX IF NOT EXISTS idx_solicitudes_cat_estado ON public.solicitudes(categoria_id, estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON public.solicitudes(cliente_id);

CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES public.solicitudes(id) ON DELETE CASCADE,
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  precio integer NOT NULL CHECK (precio >= 1000),
  precio_hasta integer NOT NULL CHECK (precio_hasta >= precio AND precio_hasta <= precio * 1.5),
  mensaje text NOT NULL CHECK (char_length(mensaje) BETWEEN 10 AND 1000),
  disponible_desde date,
  estado text NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada','aceptada','rechazada','retirada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (solicitud_id, prestador_id)
);
GRANT SELECT, INSERT, UPDATE ON public.cotizaciones TO authenticated;
GRANT ALL ON public.cotizaciones TO service_role;
CREATE INDEX IF NOT EXISTS idx_cotizaciones_solicitud ON public.cotizaciones(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_prestador ON public.cotizaciones(prestador_id);

ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- Cliente: CRUD de sus solicitudes
DROP POLICY IF EXISTS "cliente crea solicitud" ON public.solicitudes;
CREATE POLICY "cliente crea solicitud" ON public.solicitudes FOR INSERT TO authenticated
  WITH CHECK (cliente_id = public.current_usuario_id());
DROP POLICY IF EXISTS "cliente actualiza solicitud" ON public.solicitudes;
CREATE POLICY "cliente actualiza solicitud" ON public.solicitudes FOR UPDATE TO authenticated
  USING (cliente_id = public.current_usuario_id()) WITH CHECK (cliente_id = public.current_usuario_id());
-- Lectura: el cliente, el admin, y prestadores VERIFICADOS de la misma categoría (solo abiertas)
DROP POLICY IF EXISTS "lee solicitudes" ON public.solicitudes;
CREATE POLICY "lee solicitudes" ON public.solicitudes FOR SELECT TO authenticated
  USING (
    cliente_id = public.current_usuario_id()
    OR public.is_admin()
    OR (estado = 'abierta' AND expira_at > now() AND categoria_id IN (
         SELECT categoria_id FROM public.prestadores
           WHERE usuario_id = public.current_usuario_id() AND verificado = true AND suspendido = false))
    OR id IN (SELECT solicitud_id FROM public.cotizaciones c
               JOIN public.prestadores p ON p.id = c.prestador_id
              WHERE p.usuario_id = public.current_usuario_id())
  );

-- Prestador verificado cotiza (una vez por solicitud) dentro de su rango
DROP POLICY IF EXISTS "prestador cotiza" ON public.cotizaciones;
CREATE POLICY "prestador cotiza" ON public.cotizaciones FOR INSERT TO authenticated
  WITH CHECK (prestador_id IN (
    SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id() AND verificado = true AND suspendido = false));
DROP POLICY IF EXISTS "prestador edita su cotizacion" ON public.cotizaciones;
CREATE POLICY "prestador edita su cotizacion" ON public.cotizaciones FOR UPDATE TO authenticated
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()));
DROP POLICY IF EXISTS "lee cotizaciones" ON public.cotizaciones;
CREATE POLICY "lee cotizaciones" ON public.cotizaciones FOR SELECT TO authenticated
  USING (
    prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id())
    OR solicitud_id IN (SELECT id FROM public.solicitudes WHERE cliente_id = public.current_usuario_id())
    OR public.is_admin()
  );

-- Solo el cliente dueño puede aceptar; el prestador solo puede retirar la suya
CREATE OR REPLACE FUNCTION public.validar_cambio_cotizacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := public.current_usuario_id(); v_cliente uuid;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  SELECT cliente_id INTO v_cliente FROM public.solicitudes WHERE id = OLD.solicitud_id;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'retirada' AND EXISTS (SELECT 1 FROM public.prestadores WHERE id = OLD.prestador_id AND usuario_id = v_me) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cambio de estado no permitido';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validar_cambio_cotizacion ON public.cotizaciones;
CREATE TRIGGER trg_validar_cambio_cotizacion BEFORE UPDATE ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.validar_cambio_cotizacion();

-- Aceptar cotización: crea la reserva (precio de la cotización) y cierra la solicitud. Atómico.
CREATE OR REPLACE FUNCTION public.aceptar_cotizacion(_cotizacion_id uuid, _fecha date, _hora time, _direccion text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; s record; v_reserva uuid; v_servicio uuid;
BEGIN
  SELECT * INTO c FROM public.cotizaciones WHERE id = _cotizacion_id;
  IF c IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  SELECT * INTO s FROM public.solicitudes WHERE id = c.solicitud_id;
  IF s.cliente_id IS DISTINCT FROM public.current_usuario_id() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF s.estado <> 'abierta' THEN RAISE EXCEPTION 'La solicitud ya no está abierta'; END IF;
  IF c.estado <> 'enviada' THEN RAISE EXCEPTION 'La cotización ya no está disponible'; END IF;

  -- Servicio asociado: el de la solicitud o el primero del prestador en esa categoría
  v_servicio := s.servicio_id;
  IF v_servicio IS NULL OR NOT EXISTS (SELECT 1 FROM public.prestador_servicios WHERE prestador_id = c.prestador_id AND servicio_id = v_servicio) THEN
    SELECT ps.servicio_id INTO v_servicio FROM public.prestador_servicios ps WHERE ps.prestador_id = c.prestador_id LIMIT 1;
  END IF;

  INSERT INTO public.reservas (cliente_id, prestador_id, servicio_id, fecha, hora, direccion, nota, total, comision, estado)
  VALUES (s.cliente_id, c.prestador_id, v_servicio, _fecha, _hora, COALESCE(_direccion, s.direccion, ''),
          'Cotización aceptada: ' || left(s.titulo, 80), c.precio + ROUND(c.precio * 0.15), ROUND(c.precio * 0.15), 'pendiente')
  RETURNING id INTO v_reserva;

  UPDATE public.cotizaciones SET estado = 'aceptada' WHERE id = c.id;
  UPDATE public.cotizaciones SET estado = 'rechazada' WHERE solicitud_id = s.id AND id <> c.id AND estado = 'enviada';
  UPDATE public.solicitudes SET estado = 'adjudicada', cotizacion_aceptada_id = c.id WHERE id = s.id;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  SELECT p.usuario_id, 'cotizacion', '¡Tu cotización fue aceptada!', 'El cliente aceptó tu cotización por ' || s.titulo || '. Revisa la reserva.', v_reserva
    FROM public.prestadores p WHERE p.id = c.prestador_id;
  RETURN v_reserva;
END; $$;
REVOKE EXECUTE ON FUNCTION public.aceptar_cotizacion(uuid, date, time, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceptar_cotizacion(uuid, date, time, text) TO authenticated;

-- El precio de una reserva creada por cotización no debe ser recalculado por fill_reserva_total:
-- la nota empieza con 'Cotización aceptada'. Ajustamos el trigger existente.
CREATE OR REPLACE FUNCTION public.fill_reserva_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_precio integer;
BEGIN
  IF NEW.nota LIKE 'Cotización aceptada:%' AND auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.total IS NOT DISTINCT FROM OLD.total
     AND NEW.servicio_id IS NOT DISTINCT FROM OLD.servicio_id AND NEW.prestador_id IS NOT DISTINCT FROM OLD.prestador_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.nota LIKE 'Cotización aceptada:%' THEN
    NEW.total := OLD.total; NEW.comision := OLD.comision; RETURN NEW;
  END IF;
  IF NEW.servicio_id IS NOT NULL THEN
    SELECT precio INTO v_precio FROM public.prestador_servicios
     WHERE prestador_id = NEW.prestador_id AND servicio_id = NEW.servicio_id LIMIT 1;
  END IF;
  IF v_precio IS NOT NULL THEN
    NEW.comision := ROUND(v_precio * 0.15);
    NEW.total := v_precio + NEW.comision;
  END IF;
  RETURN NEW;
END; $$;

-- Notificar a los prestadores verificados de la categoría cuando hay una solicitud nueva
CREATE OR REPLACE FUNCTION public.notify_nueva_solicitud()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT p.usuario_id, 'solicitud', 'Nueva solicitud en tu rubro', left(NEW.titulo, 100) || ' — cotiza antes que otros.'
    FROM public.prestadores p
   WHERE p.categoria_id = NEW.categoria_id AND p.verificado = true AND p.suspendido = false;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_nueva_solicitud ON public.solicitudes;
CREATE TRIGGER trg_notify_nueva_solicitud AFTER INSERT ON public.solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.notify_nueva_solicitud();

-- Notificar al cliente cuando recibe una cotización
CREATE OR REPLACE FUNCTION public.notify_nueva_cotizacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT s.cliente_id, 'cotizacion', 'Recibiste una cotización', 'Un profesional cotizó tu solicitud "' || left(s.titulo, 60) || '".'
    FROM public.solicitudes s WHERE s.id = NEW.solicitud_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_nueva_cotizacion ON public.cotizaciones;
CREATE TRIGGER trg_notify_nueva_cotizacion AFTER INSERT ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.notify_nueva_cotizacion();

-- Guía de precios pública: rango real por servicio según lo publicado por profesionales verificados
CREATE OR REPLACE VIEW public.guia_precios WITH (security_invoker = true) AS
  SELECT s.id AS servicio_id, s.nombre AS servicio, s.categoria_id,
         COUNT(ps.id)::int AS profesionales,
         MIN(ps.precio)::int AS precio_min,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ps.precio)::int AS precio_mediana,
         MAX(ps.precio_hasta)::int AS precio_max
    FROM public.servicios s
    JOIN public.prestador_servicios ps ON ps.servicio_id = s.id
    JOIN public.prestadores p ON p.id = ps.prestador_id AND p.verificado = true AND p.suspendido = false
   GROUP BY s.id, s.nombre, s.categoria_id;
GRANT SELECT ON public.guia_precios TO anon, authenticated;

-- Fotos de solicitudes: bucket público (no contiene datos personales sensibles)
-- El bucket solicitudes se crea por separado mediante la herramienta de almacenamiento.
DROP POLICY IF EXISTS "solicitudes public read" ON storage.objects;
CREATE POLICY "solicitudes public read" ON storage.objects FOR SELECT USING (bucket_id = 'solicitudes');
DROP POLICY IF EXISTS "solicitudes owner insert" ON storage.objects;
CREATE POLICY "solicitudes owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'solicitudes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Estadísticas públicas para la portada
CREATE OR REPLACE FUNCTION public.stats_publicas()
RETURNS TABLE (profesionales int, servicios_completados int, calificacion numeric, resenas int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT COUNT(*)::int FROM public.prestadores WHERE verificado = true AND suspendido = false),
         (SELECT COUNT(*)::int FROM public.reservas WHERE estado = 'completada'),
         (SELECT COALESCE(ROUND(AVG(calificacion), 1), 5.0) FROM public.resenas),
         (SELECT COUNT(*)::int FROM public.resenas);
$$;
GRANT EXECUTE ON FUNCTION public.stats_publicas() TO anon, authenticated;
