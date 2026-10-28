-- ============================================================
-- Referidos entre profesionales, bloqueo de "por fuera" y moderación
-- ============================================================

-- 1) Profesional invita a profesional: cuando el invitado queda verificado, ambos
--    reciben +30 días de Premium.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS bono_referido_pro_pagado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.bono_referido_profesional()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv record; v_ref_prestador record;
BEGIN
  IF NEW.verificado = true AND OLD.verificado IS DISTINCT FROM true THEN
    SELECT * INTO v_inv FROM public.usuarios WHERE id = NEW.usuario_id;
    IF v_inv.referido_por IS NULL OR v_inv.bono_referido_pro_pagado THEN RETURN NEW; END IF;
    SELECT * INTO v_ref_prestador FROM public.prestadores WHERE usuario_id = v_inv.referido_por;
    IF v_ref_prestador IS NULL THEN RETURN NEW; END IF;  -- quien invitó es cliente: aplica el bono normal de cupones
    UPDATE public.usuarios SET bono_referido_pro_pagado = true WHERE id = v_inv.id;
    UPDATE public.prestadores SET pro_hasta = GREATEST(COALESCE(pro_hasta, now()), now()) + interval '30 days', plan = 'pro'
      WHERE id IN (NEW.id, v_ref_prestador.id);
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje) VALUES
      (v_ref_prestador.usuario_id, 'pro', 'Ganaste 1 mes de Premium', split_part(COALESCE(v_inv.nombre,'Tu colega'),' ',1) || ' ya está verificado. Sumamos 30 días de Homie Premium a tu cuenta.'),
      (v_inv.id, 'pro', 'Regalo de bienvenida: 1 mes de Premium', 'Por llegar invitado por un colega, sumamos 30 días de Homie Premium.');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bono_referido_profesional ON public.prestadores;
CREATE TRIGGER trg_bono_referido_profesional AFTER UPDATE OF verificado ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.bono_referido_profesional();

-- 2) Bloqueo de datos de contacto en el chat ANTES del pago (evita cerrar "por fuera").
--    Después del pago, el contacto ya es visible y el chat es libre.
CREATE OR REPLACE FUNCTION public.contiene_contacto(_t text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _t ~* '(\+?56\s?9\s?\d{4}\s?\d{4}|\b9\s?\d{4}\s?\d{4}\b|\b\d{8,9}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|wa\.me|whatsapp|instagram\.com|@[a-z0-9_.]{4,}|transferencia (por )?fuera|fuera de (la )?app|sin la app|te lo dejo m[aá]s barato por fuera)';
$$;

CREATE OR REPLACE FUNCTION public.bloquear_contacto_sin_pago()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.contiene_contacto(NEW.contenido)
     AND NOT EXISTS (SELECT 1 FROM public.pagos WHERE reserva_id = NEW.reserva_id AND estado = 'pagado') THEN
    INSERT INTO public.moderacion_eventos (usuario_id, origen, texto, motivo)
    VALUES (NEW.remitente_id, 'chat', left(NEW.contenido, 500), 'contacto_sin_pago');
    RAISE EXCEPTION 'Por tu seguridad, los datos de contacto se comparten cuando la reserva está pagada. El pago queda protegido por Homie.';
  END IF;
  RETURN NEW;
END; $$;

-- 3) Registro de moderación (para que el admin vea patrones y suspenda reincidentes)
CREATE TABLE IF NOT EXISTS public.moderacion_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  origen text NOT NULL CHECK (origen IN ('chat','resena','respuesta','solicitud','cotizacion','perfil')),
  texto text,
  motivo text NOT NULL,
  puntaje numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moderacion_usuario ON public.moderacion_eventos(usuario_id, created_at);
ALTER TABLE public.moderacion_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin lee moderacion" ON public.moderacion_eventos;
CREATE POLICY "admin lee moderacion" ON public.moderacion_eventos FOR SELECT TO authenticated USING (public.is_admin());
GRANT INSERT ON public.moderacion_eventos TO service_role;

DROP TRIGGER IF EXISTS trg_bloquear_contacto ON public.mensajes;
CREATE TRIGGER trg_bloquear_contacto BEFORE INSERT ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_contacto_sin_pago();

-- Las reseñas y respuestas que el filtro de palabras bloquea también quedan registradas
CREATE OR REPLACE FUNCTION public.bloquear_ofensivo_resena()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.contiene_lenguaje_ofensivo(NEW.comentario) OR public.contiene_lenguaje_ofensivo(NEW.respuesta_prestador) THEN
    INSERT INTO public.moderacion_eventos (usuario_id, origen, texto, motivo)
    VALUES (NEW.cliente_id, 'resena', left(COALESCE(NEW.comentario, NEW.respuesta_prestador), 500), 'ofensivo');
    RAISE EXCEPTION 'Tu mensaje contiene lenguaje ofensivo. Por favor, escríbelo con respeto.';
  END IF;
  RETURN NEW;
END; $$;

-- Resumen por usuario para el admin
CREATE OR REPLACE VIEW public.moderacion_resumen AS
  SELECT m.usuario_id, u.nombre, u.email, u.tipo, COUNT(*)::int AS eventos, MAX(m.created_at) AS ultimo,
         array_agg(DISTINCT m.motivo) AS motivos
    FROM public.moderacion_eventos m JOIN public.usuarios u ON u.id = m.usuario_id
   GROUP BY m.usuario_id, u.nombre, u.email, u.tipo;
ALTER VIEW public.moderacion_resumen SET (security_invoker = true);
GRANT SELECT ON public.moderacion_resumen TO authenticated;

-- 4) Idioma preferido del usuario (para notificaciones futuras)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS idioma text NOT NULL DEFAULT 'es' CHECK (idioma IN ('es','en','ht','pt'));
