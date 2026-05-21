
-- 1) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user','admin','superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
$$;

DROP POLICY IF EXISTS "admins read roles" ON public.user_roles;
CREATE POLICY "admins read roles" ON public.user_roles FOR SELECT USING (public.is_admin() OR user_id = auth.uid());
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2) Verificaciones: motivo rechazo + admin policies
ALTER TABLE public.verificaciones_prestador
  ADD COLUMN IF NOT EXISTS motivo_rechazo text;

DROP POLICY IF EXISTS "admin lee todas verificaciones" ON public.verificaciones_prestador;
CREATE POLICY "admin lee todas verificaciones"
  ON public.verificaciones_prestador FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin actualiza verificaciones" ON public.verificaciones_prestador;
CREATE POLICY "admin actualiza verificaciones"
  ON public.verificaciones_prestador FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin actualiza prestadores" ON public.prestadores;
CREATE POLICY "admin actualiza prestadores"
  ON public.prestadores FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3) Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('verificaciones','verificaciones', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "prestador sube verificaciones" ON storage.objects;
CREATE POLICY "prestador sube verificaciones" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verificaciones' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "prestador lee verificaciones" ON storage.objects;
CREATE POLICY "prestador lee verificaciones" ON storage.objects FOR SELECT
  USING (bucket_id = 'verificaciones' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

DROP POLICY IF EXISTS "prestador actualiza verificaciones" ON storage.objects;
CREATE POLICY "prestador actualiza verificaciones" ON storage.objects FOR UPDATE
  USING (bucket_id = 'verificaciones' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "prestador borra verificaciones" ON storage.objects;
CREATE POLICY "prestador borra verificaciones" ON storage.objects FOR DELETE
  USING (bucket_id = 'verificaciones' AND auth.uid()::text = (storage.foldername(name))[1]);
