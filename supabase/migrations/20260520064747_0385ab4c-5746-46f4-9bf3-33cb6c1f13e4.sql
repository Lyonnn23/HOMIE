DROP POLICY IF EXISTS "public insert reservas" ON public.reservas;
CREATE POLICY "auth insert own reservas"
  ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (cliente_id = public.current_usuario_id());

DROP POLICY IF EXISTS "public insert resenas" ON public.resenas;
CREATE POLICY "auth insert own resenas"
  ON public.resenas FOR INSERT TO authenticated
  WITH CHECK (cliente_id = public.current_usuario_id());