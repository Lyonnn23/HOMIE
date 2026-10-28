-- Explicit access keeps the security-invoker summary admin-only.
REVOKE ALL ON public.moderacion_eventos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.moderacion_eventos TO authenticated;
GRANT ALL ON public.moderacion_eventos TO service_role;
REVOKE ALL ON public.moderacion_resumen FROM PUBLIC, anon;
GRANT SELECT ON public.moderacion_resumen TO authenticated, service_role;
ALTER VIEW public.moderacion_resumen SET (security_invoker = true);

-- A browser cannot reset or forge the professional referral award.
CREATE OR REPLACE FUNCTION public.proteger_bono_referido_pro()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.bono_referido_pro_pagado THEN
        RAISE EXCEPTION 'No autorizado: bono profesional protegido';
      END IF;
    ELSIF NEW.bono_referido_pro_pagado IS DISTINCT FROM OLD.bono_referido_pro_pagado THEN
      RAISE EXCEPTION 'No autorizado: bono profesional protegido';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_00_proteger_bono_referido_pro BEFORE INSERT OR UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.proteger_bono_referido_pro();

-- Keep the requested verification milestone; serialize eligibility and award once.
CREATE OR REPLACE FUNCTION public.bono_referido_profesional()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv public.usuarios%ROWTYPE; v_ref_prestador public.prestadores%ROWTYPE;
BEGIN
  IF NEW.verificado = true AND OLD.verificado IS DISTINCT FROM true THEN
    SELECT * INTO v_inv FROM public.usuarios WHERE id = NEW.usuario_id FOR UPDATE;
    IF NOT FOUND THEN RETURN NEW; END IF;
    IF v_inv.referido_por IS NULL OR v_inv.referido_por = v_inv.id OR v_inv.bono_referido_pro_pagado THEN RETURN NEW; END IF;
    SELECT * INTO v_ref_prestador FROM public.prestadores WHERE usuario_id = v_inv.referido_por;
    IF NOT FOUND OR v_ref_prestador.id = NEW.id THEN RETURN NEW; END IF;
    UPDATE public.usuarios SET bono_referido_pro_pagado = true WHERE id = v_inv.id;
    UPDATE public.prestadores SET pro_hasta = GREATEST(COALESCE(pro_hasta, now()), now()) + interval '30 days', plan = 'pro'
      WHERE id IN (NEW.id, v_ref_prestador.id);
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje) VALUES
      (v_ref_prestador.usuario_id, 'pro', 'Ganaste 1 mes de Premium', split_part(COALESCE(v_inv.nombre,'Tu colega'),' ',1) || ' ya está verificado. Sumamos 30 días de Homie Premium a tu cuenta.'),
      (v_inv.id, 'pro', 'Regalo de bienvenida: 1 mes de Premium', 'Por llegar invitado por un colega, sumamos 30 días de Homie Premium.');
  END IF;
  RETURN NEW;
END; $$;

-- PostgreSQL word boundaries are \m and \M, not JavaScript's \b.
CREATE OR REPLACE FUNCTION public.contiene_contacto(_t text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(_t ~* '(\+?56\s?9\s?\d{4}\s?\d{4}|\m9\s?\d{4}\s?\d{4}\M|\m\d{8,9}\M|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|wa\.me|whatsapp|instagram\.com|@[a-z0-9_.]{4,}|transferencia (por )?fuera|fuera de (la )?app|sin la app|te lo dejo m[aá]s barato por fuera|por fuera)', false);
$$;

-- Reject writes in PostgreSQL. Rejected-attempt history is persisted by the
-- authenticated moderation server function in a separate successful request:
-- an INSERT followed by RAISE in this trigger would roll back the log as well.
CREATE OR REPLACE FUNCTION public.bloquear_contacto_sin_pago()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.contiene_contacto(NEW.contenido)
     AND NOT EXISTS (SELECT 1 FROM public.pagos WHERE reserva_id = NEW.reserva_id AND estado = 'pagado') THEN
    RAISE EXCEPTION 'Por tu seguridad, los datos de contacto se comparten cuando la reserva está pagada. El pago queda protegido por Homie.';
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.bloquear_ofensivo_resena()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.contiene_lenguaje_ofensivo(NEW.comentario) OR public.contiene_lenguaje_ofensivo(NEW.respuesta_prestador) THEN
    RAISE EXCEPTION 'Tu mensaje contiene lenguaje ofensivo. Por favor, escríbelo con respeto.';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.bono_referido_profesional(), public.proteger_bono_referido_pro(), public.bloquear_contacto_sin_pago(), public.bloquear_ofensivo_resena() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bono_referido_profesional(), public.proteger_bono_referido_pro(), public.bloquear_contacto_sin_pago(), public.bloquear_ofensivo_resena() TO service_role;
