-- Link usuarios to auth.users
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Trigger to auto-create usuario on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (user_id, nombre, email, foto_url, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'tipo')::user_type, 'cliente'::user_type)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper to map auth.uid() to usuarios.id
CREATE OR REPLACE FUNCTION public.current_usuario_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.usuarios WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS: usuarios
CREATE POLICY "users update own usuario"
  ON public.usuarios FOR UPDATE
  USING (user_id = auth.uid());

-- RLS: prestadores - allow self-insert/update
CREATE POLICY "users insert own prestador"
  ON public.prestadores FOR INSERT
  WITH CHECK (usuario_id = public.current_usuario_id());

CREATE POLICY "users update own prestador"
  ON public.prestadores FOR UPDATE
  USING (usuario_id = public.current_usuario_id());

-- RLS: prestador_servicios
CREATE POLICY "users insert own prestador_servicios"
  ON public.prestador_servicios FOR INSERT
  WITH CHECK (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()));

CREATE POLICY "users delete own prestador_servicios"
  ON public.prestador_servicios FOR DELETE
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()));