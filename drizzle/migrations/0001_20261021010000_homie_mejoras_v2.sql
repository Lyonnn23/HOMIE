-- ============================================================
-- Homie v2: categorías nuevas, servicios con rango de precio y descripción,
-- horario del prestador, perfil personalizable, filtro de lenguaje ofensivo,
-- reclamos y sugerencias.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Categorías y servicios nuevos
-- ------------------------------------------------------------
-- Datos iniciales aplicados por separado mediante la herramienta de datos.

-- Datos iniciales aplicados por separado mediante la herramienta de datos.

-- ------------------------------------------------------------
-- 2) Servicios del prestador: rango de precio, descripción y foto.
--    `precio` es el valor DESDE (lo que se cobra al reservar).
--    `precio_hasta` es el tope: nunca más de 1.5x del precio desde,
--    así el cliente nunca se lleva una sorpresa.
-- ------------------------------------------------------------
ALTER TABLE public.prestador_servicios
  ADD COLUMN IF NOT EXISTS precio_hasta integer,
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS incluye text;

UPDATE public.prestador_servicios SET precio_hasta = precio WHERE precio_hasta IS NULL;
ALTER TABLE public.prestador_servicios ALTER COLUMN precio_hasta SET NOT NULL;

ALTER TABLE public.prestador_servicios DROP CONSTRAINT IF EXISTS prestador_servicios_rango_chk;
ALTER TABLE public.prestador_servicios ADD CONSTRAINT prestador_servicios_rango_chk
  CHECK (precio >= 1000 AND precio_hasta >= precio AND precio_hasta <= precio * 1.5);

ALTER TABLE public.prestador_servicios DROP CONSTRAINT IF EXISTS prestador_servicios_descripcion_chk;
ALTER TABLE public.prestador_servicios ADD CONSTRAINT prestador_servicios_descripcion_chk
  CHECK (descripcion IS NULL OR char_length(descripcion) <= 600);

-- Mantener precio_desde / precio_hasta del prestador sincronizados con sus servicios
CREATE OR REPLACE FUNCTION public.sync_prestador_rango_precios()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid := COALESCE(NEW.prestador_id, OLD.prestador_id);
BEGIN
  UPDATE public.prestadores p SET
    precio_desde = COALESCE((SELECT MIN(precio) FROM public.prestador_servicios WHERE prestador_id = v_pid), p.precio_desde),
    precio_hasta = COALESCE((SELECT MAX(precio_hasta) FROM public.prestador_servicios WHERE prestador_id = v_pid), p.precio_hasta)
  WHERE p.id = v_pid;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_prestador_rango_precios() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_prestador_rango ON public.prestador_servicios;
CREATE TRIGGER trg_sync_prestador_rango
  AFTER INSERT OR UPDATE OR DELETE ON public.prestador_servicios
  FOR EACH ROW EXECUTE FUNCTION public.sync_prestador_rango_precios();

-- Los prestadores pueden editar sus propios servicios (descripción, rango, foto)
DROP POLICY IF EXISTS "users update own prestador_servicios" ON public.prestador_servicios;
CREATE POLICY "users update own prestador_servicios"
  ON public.prestador_servicios FOR UPDATE TO authenticated
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()))
  WITH CHECK (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()));

-- Bucket público para fotos de servicios y banners de perfil
-- Datos iniciales aplicados por separado mediante la herramienta de datos.
DROP POLICY IF EXISTS "perfiles public read" ON storage.objects;
CREATE POLICY "perfiles public read" ON storage.objects FOR SELECT USING (bucket_id = 'perfiles');
DROP POLICY IF EXISTS "perfiles owner insert" ON storage.objects;
CREATE POLICY "perfiles owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'perfiles' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "perfiles owner update" ON storage.objects;
CREATE POLICY "perfiles owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'perfiles' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "perfiles owner delete" ON storage.objects;
CREATE POLICY "perfiles owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'perfiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ------------------------------------------------------------
-- 3) Prestador: horario semanal, banner y color del perfil, teléfono,
--    experiencia y especialidad para el perfil profesional.
-- ------------------------------------------------------------
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS horario jsonb NOT NULL DEFAULT '{
    "lun":{"activo":true,"desde":"09:00","hasta":"18:00"},
    "mar":{"activo":true,"desde":"09:00","hasta":"18:00"},
    "mie":{"activo":true,"desde":"09:00","hasta":"18:00"},
    "jue":{"activo":true,"desde":"09:00","hasta":"18:00"},
    "vie":{"activo":true,"desde":"09:00","hasta":"18:00"},
    "sab":{"activo":false,"desde":"10:00","hasta":"14:00"},
    "dom":{"activo":false,"desde":"10:00","hasta":"14:00"}
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS color_perfil text,
  ADD COLUMN IF NOT EXISTS titulo_profesional text,
  ADD COLUMN IF NOT EXISTS anos_experiencia integer CHECK (anos_experiencia IS NULL OR anos_experiencia BETWEEN 0 AND 60),
  ADD COLUMN IF NOT EXISTS comuna text;

-- Teléfono / WhatsApp del prestador: dato PRIVADO en tabla aparte.
-- Solo lo ve el dueño, el admin y un cliente con reserva PAGADA y vigente.
CREATE TABLE IF NOT EXISTS public.prestador_contacto (
  prestador_id uuid PRIMARY KEY REFERENCES public.prestadores(id) ON DELETE CASCADE,
  telefono text,
  whatsapp text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestador_contacto TO authenticated;
GRANT ALL ON public.prestador_contacto TO service_role;
ALTER TABLE public.prestador_contacto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dueno gestiona contacto" ON public.prestador_contacto;
CREATE POLICY "dueno gestiona contacto" ON public.prestador_contacto FOR ALL TO authenticated
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()) OR public.is_admin())
  WITH CHECK (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.contacto_prestador(_reserva_id uuid)
RETURNS TABLE (telefono text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.telefono, c.whatsapp
  FROM public.reservas r
  JOIN public.prestador_contacto c ON c.prestador_id = r.prestador_id
  JOIN public.pagos pg ON pg.reserva_id = r.id AND pg.estado = 'pagado'
  WHERE r.id = _reserva_id
    AND r.cliente_id = public.current_usuario_id()
    AND r.estado IN ('confirmada','en_camino');
$$;
REVOKE EXECUTE ON FUNCTION public.contacto_prestador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contacto_prestador(uuid) TO authenticated;

-- Las verificaciones ahora EXIGEN al menos un certificado del rubro
ALTER TABLE public.verificaciones_prestador DROP CONSTRAINT IF EXISTS verificaciones_cert_requerido;
ALTER TABLE public.verificaciones_prestador ADD CONSTRAINT verificaciones_cert_requerido
  CHECK (cardinality(certificados) >= 1) NOT VALID;

-- ------------------------------------------------------------
-- 4) Filtro de lenguaje ofensivo en reseñas, respuestas y chat
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.palabras_bloqueadas (
  palabra text PRIMARY KEY
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.palabras_bloqueadas TO authenticated;
GRANT ALL ON public.palabras_bloqueadas TO service_role;
ALTER TABLE public.palabras_bloqueadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin gestiona palabras" ON public.palabras_bloqueadas;
CREATE POLICY "admin gestiona palabras" ON public.palabras_bloqueadas
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Datos iniciales aplicados por separado mediante la herramienta de datos.

-- unaccent puede no estar disponible; versión segura
CREATE OR REPLACE FUNCTION public.unaccent_safe(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(COALESCE(_t,''), 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU');
$$;

CREATE OR REPLACE FUNCTION public.contiene_lenguaje_ofensivo(_texto text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.palabras_bloqueadas b
    WHERE lower(unaccent_safe(_texto)) ~* ('\m' || regexp_replace(unaccent_safe(b.palabra), '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\M')
  );
$$;

CREATE OR REPLACE FUNCTION public.bloquear_ofensivo_resena()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.contiene_lenguaje_ofensivo(NEW.comentario) OR public.contiene_lenguaje_ofensivo(NEW.respuesta_prestador) THEN
    RAISE EXCEPTION 'Tu mensaje contiene lenguaje ofensivo. Por favor, escríbelo con respeto.';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_ofensivo_resena ON public.resenas;
CREATE TRIGGER trg_ofensivo_resena BEFORE INSERT OR UPDATE ON public.resenas
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_ofensivo_resena();

CREATE OR REPLACE FUNCTION public.bloquear_ofensivo_mensaje()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.contiene_lenguaje_ofensivo(NEW.contenido) THEN
    RAISE EXCEPTION 'Tu mensaje contiene lenguaje ofensivo. Por favor, escríbelo con respeto.';
  END IF;
  RETURN NEW;
END; $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mensajes' AND column_name='contenido') THEN
    DROP TRIGGER IF EXISTS trg_ofensivo_mensaje ON public.mensajes;
    CREATE TRIGGER trg_ofensivo_mensaje BEFORE INSERT OR UPDATE ON public.mensajes
      FOR EACH ROW EXECUTE FUNCTION public.bloquear_ofensivo_mensaje();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) Reclamos y sugerencias (clientes y prestadores). Homie media.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reclamos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('reclamo','sugerencia')),
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
  asunto text NOT NULL CHECK (char_length(asunto) BETWEEN 3 AND 120),
  detalle text NOT NULL CHECK (char_length(detalle) BETWEEN 10 AND 2000),
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','en_revision','resuelto','cerrado')),
  respuesta_admin text,
  respondido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamos TO authenticated;
GRANT ALL ON public.reclamos TO service_role;
CREATE INDEX IF NOT EXISTS idx_reclamos_autor ON public.reclamos(autor_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_estado ON public.reclamos(estado);
ALTER TABLE public.reclamos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario crea reclamo" ON public.reclamos;
CREATE POLICY "usuario crea reclamo" ON public.reclamos FOR INSERT TO authenticated
  WITH CHECK (autor_id = public.current_usuario_id());
DROP POLICY IF EXISTS "usuario lee sus reclamos" ON public.reclamos;
CREATE POLICY "usuario lee sus reclamos" ON public.reclamos FOR SELECT TO authenticated
  USING (autor_id = public.current_usuario_id() OR public.is_admin());
DROP POLICY IF EXISTS "admin responde reclamos" ON public.reclamos;
CREATE POLICY "admin responde reclamos" ON public.reclamos FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notificar al autor cuando el admin responde
CREATE OR REPLACE FUNCTION public.notify_respuesta_reclamo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.respuesta_admin IS DISTINCT FROM OLD.respuesta_admin AND NEW.respuesta_admin IS NOT NULL THEN
    NEW.respondido_at := now();
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    VALUES (NEW.autor_id, 'reclamo',
      CASE WHEN NEW.tipo = 'reclamo' THEN 'Respuesta a tu reclamo' ELSE 'Gracias por tu sugerencia' END,
      left(NEW.respuesta_admin, 140));
  END IF;
  RETURN NEW;
END; $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notificaciones' AND column_name='mensaje') THEN
    DROP TRIGGER IF EXISTS trg_notify_reclamo ON public.reclamos;
    CREATE TRIGGER trg_notify_reclamo BEFORE UPDATE ON public.reclamos
      FOR EACH ROW EXECUTE FUNCTION public.notify_respuesta_reclamo();
  END IF;
END $$;
