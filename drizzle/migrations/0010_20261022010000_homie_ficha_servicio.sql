-- Ficha detallada del servicio y del profesional (onboarding extendido)
ALTER TABLE public.prestador_servicios
  ADD COLUMN IF NOT EXISTS unidad text NOT NULL DEFAULT 'trabajo'
    CHECK (unidad IN ('hora','visita','trabajo','sesion','dia','m2')),
  ADD COLUMN IF NOT EXISTS duracion_min integer CHECK (duracion_min IS NULL OR duracion_min BETWEEN 15 AND 1440),
  ADD COLUMN IF NOT EXISTS garantia_dias integer NOT NULL DEFAULT 0 CHECK (garantia_dias BETWEEN 0 AND 365),
  ADD COLUMN IF NOT EXISTS materiales_incluidos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_incluye text CHECK (no_incluye IS NULL OR char_length(no_incluye) <= 400);
ALTER TABLE public.prestador_servicios DROP CONSTRAINT IF EXISTS prestador_servicios_incluye_chk;
ALTER TABLE public.prestador_servicios ADD CONSTRAINT prestador_servicios_incluye_chk
  CHECK (incluye IS NULL OR char_length(incluye) <= 600);

ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS especialidades text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS comunas_cobertura text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS radio_km integer NOT NULL DEFAULT 15 CHECK (radio_km BETWEEN 1 AND 200),
  ADD COLUMN IF NOT EXISTS idiomas text[] NOT NULL DEFAULT '{español}',
  ADD COLUMN IF NOT EXISTS tiene_vehiculo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS herramientas_propias boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS emite_boleta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS formas_pago_extra text[] NOT NULL DEFAULT '{}';
