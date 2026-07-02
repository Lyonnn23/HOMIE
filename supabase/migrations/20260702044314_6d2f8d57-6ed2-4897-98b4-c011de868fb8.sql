CREATE TABLE public.direcciones_guardadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  etiqueta text NOT NULL,
  direccion text NOT NULL,
  comuna text,
  detalle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direcciones_guardadas TO authenticated;
GRANT ALL ON public.direcciones_guardadas TO service_role;

ALTER TABLE public.direcciones_guardadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dueño gestiona sus direcciones"
  ON public.direcciones_guardadas
  FOR ALL TO authenticated
  USING (usuario_id = public.current_usuario_id())
  WITH CHECK (usuario_id = public.current_usuario_id());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_direcciones_touch
  BEFORE UPDATE ON public.direcciones_guardadas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();