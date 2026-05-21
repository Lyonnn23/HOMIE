
-- reportes
CREATE TABLE IF NOT EXISTS public.reportes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL,
  reportante_id uuid NOT NULL,
  reportado_id uuid NOT NULL,
  motivo text NOT NULL,
  descripcion text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','resuelto')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reportes_reportado ON public.reportes(reportado_id);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON public.reportes(estado);

ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente crea reporte" ON public.reportes;
CREATE POLICY "cliente crea reporte" ON public.reportes FOR INSERT
  WITH CHECK (
    reportante_id = public.current_usuario_id()
    AND reserva_id IN (SELECT id FROM public.reservas WHERE cliente_id = public.current_usuario_id())
  );

DROP POLICY IF EXISTS "lee mis reportes" ON public.reportes;
CREATE POLICY "lee mis reportes" ON public.reportes FOR SELECT
  USING (reportante_id = public.current_usuario_id() OR public.is_admin());

DROP POLICY IF EXISTS "admin actualiza reportes" ON public.reportes;
CREATE POLICY "admin actualiza reportes" ON public.reportes FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- prestadores: suspendido
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS suspendido boolean NOT NULL DEFAULT false;

-- Reemplazar política de lectura pública para ocultar suspendidos
DROP POLICY IF EXISTS "public read prestadores" ON public.prestadores;
CREATE POLICY "public read prestadores" ON public.prestadores FOR SELECT
  USING (
    suspendido = false
    OR public.is_admin()
    OR usuario_id = public.current_usuario_id()
  );
