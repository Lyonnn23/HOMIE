
-- categorias: añadir color_hex y slug
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.categorias SET color_hex = COALESCE(color_hex, color_fondo) WHERE color_hex IS NULL;
UPDATE public.categorias SET slug = COALESCE(slug, id) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categorias_slug_unique ON public.categorias(slug);

-- prestadores: campos adicionales
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS ciudad text NOT NULL DEFAULT 'Santiago',
  ADD COLUMN IF NOT EXISTS verificado_identidad boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS antecedentes_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basico'
    CHECK (plan IN ('basico','pro','elite'));

-- reservas: comision
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS comision integer NOT NULL DEFAULT 0;

-- resenas: foto_url
ALTER TABLE public.resenas
  ADD COLUMN IF NOT EXISTS foto_url text;

-- mensajes: foto_url + leido
ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS leido boolean NOT NULL DEFAULT false;

-- favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  prestador_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, prestador_id)
);
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente lee sus favoritos" ON public.favoritos
  FOR SELECT USING (cliente_id = public.current_usuario_id());
CREATE POLICY "cliente agrega favoritos" ON public.favoritos
  FOR INSERT WITH CHECK (cliente_id = public.current_usuario_id());
CREATE POLICY "cliente borra sus favoritos" ON public.favoritos
  FOR DELETE USING (cliente_id = public.current_usuario_id());

-- creditos
CREATE TABLE IF NOT EXISTS public.creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  monto integer NOT NULL,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario lee sus creditos" ON public.creditos
  FOR SELECT USING (usuario_id = public.current_usuario_id());
-- Sin INSERT/UPDATE/DELETE públicos: solo el sistema (service role) los gestiona.

-- verificaciones_prestador
CREATE TABLE IF NOT EXISTS public.verificaciones_prestador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL,
  foto_carnet_frente text,
  foto_carnet_reverso text,
  foto_selfie text,
  certificados text[] NOT NULL DEFAULT '{}'::text[],
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','aprobado','rechazado')),
  revisado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verificaciones_prestador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prestador lee sus verificaciones" ON public.verificaciones_prestador
  FOR SELECT USING (
    prestador_id IN (
      SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()
    )
  );
CREATE POLICY "prestador crea sus verificaciones" ON public.verificaciones_prestador
  FOR INSERT WITH CHECK (
    prestador_id IN (
      SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()
    )
  );
