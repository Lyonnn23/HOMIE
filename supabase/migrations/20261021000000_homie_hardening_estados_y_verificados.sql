-- ============================================================
-- Homie: endurecimiento de reservas y visibilidad de prestadores
-- ============================================================

-- 1) Transiciones de estado de reservas controladas en el servidor.
--    Antes, cliente y prestador podían poner cualquier estado (p. ej. un cliente
--    marcar "completada" sin pagar para dejar reseña, o un prestador avanzar
--    una reserva que nunca se pagó, saltándose la comisión).
CREATE OR REPLACE FUNCTION public.validar_transicion_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_usuario_id();
  v_es_prestador boolean;
  v_pagado boolean;
BEGIN
  -- service_role (webhook de Mercado Pago), triggers internos y admins: sin restricción
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Campos que nadie debe reasignar una vez creada la reserva
  IF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.prestador_id IS DISTINCT FROM OLD.prestador_id
     OR NEW.servicio_id IS DISTINCT FROM OLD.servicio_id THEN
    RAISE EXCEPTION 'No autorizado: no se puede reasignar la reserva';
  END IF;

  IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.prestadores
     WHERE id = OLD.prestador_id AND usuario_id = v_me
  ) INTO v_es_prestador;

  SELECT EXISTS (
    SELECT 1 FROM public.pagos
     WHERE reserva_id = OLD.id AND estado = 'pagado'
  ) INTO v_pagado;

  IF v_es_prestador THEN
    IF (OLD.estado, NEW.estado) IN (
         ('pendiente'::reserva_estado,  'cancelada'::reserva_estado),
         ('confirmada'::reserva_estado, 'cancelada'::reserva_estado)) THEN
      RETURN NEW;
    END IF;
    IF NOT v_pagado THEN
      RAISE EXCEPTION 'La reserva aún no está pagada';
    END IF;
    IF (OLD.estado, NEW.estado) IN (
         ('pendiente'::reserva_estado,  'confirmada'::reserva_estado),
         ('confirmada'::reserva_estado, 'en_camino'::reserva_estado),
         ('en_camino'::reserva_estado,  'completada'::reserva_estado)) THEN
      RETURN NEW;
    END IF;
  ELSIF OLD.cliente_id = v_me THEN
    IF NEW.estado = 'cancelada' AND OLD.estado IN ('pendiente','confirmada') THEN
      RETURN NEW;
    END IF;
    IF NEW.estado = 'completada' AND OLD.estado = 'en_camino' AND v_pagado THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Cambio de estado no permitido (% → %)', OLD.estado, NEW.estado;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validar_transicion_reserva() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_transicion_reserva ON public.reservas;
CREATE TRIGGER trg_validar_transicion_reserva
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_transicion_reserva();

-- 2) Solo prestadores VERIFICADOS (y no suspendidos) aparecen al público.
--    El propio prestador y los admins siguen viendo su fila.
DROP POLICY IF EXISTS "anon read prestadores" ON public.prestadores;
CREATE POLICY "anon read prestadores"
  ON public.prestadores FOR SELECT TO anon
  USING (suspendido = false AND verificado = true);

DROP POLICY IF EXISTS "auth read prestadores" ON public.prestadores;
CREATE POLICY "auth read prestadores"
  ON public.prestadores FOR SELECT TO authenticated
  USING (
    (suspendido = false AND verificado = true)
    OR public.is_admin()
    OR usuario_id = public.current_usuario_id()
  );

-- 3) No se puede reservar a un prestador no verificado o suspendido.
CREATE OR REPLACE FUNCTION public.validar_prestador_reservable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.prestadores
     WHERE id = NEW.prestador_id AND verificado = true AND suspendido = false
  ) THEN
    RAISE EXCEPTION 'Este prestador aún no está verificado';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validar_prestador_reservable() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_prestador_reservable ON public.reservas;
CREATE TRIGGER trg_validar_prestador_reservable
  BEFORE INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_prestador_reservable();
