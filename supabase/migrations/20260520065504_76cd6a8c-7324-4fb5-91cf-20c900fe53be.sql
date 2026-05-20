-- Allow prestadores to update the status of reservas assigned to them
CREATE POLICY "prestador update own reservas"
ON public.reservas
FOR UPDATE
TO authenticated
USING (
  prestador_id IN (
    SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()
  )
)
WITH CHECK (
  prestador_id IN (
    SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()
  )
);

-- Allow clients to update (cancel / mark completed) their own reservas
CREATE POLICY "cliente update own reservas"
ON public.reservas
FOR UPDATE
TO authenticated
USING (cliente_id = public.current_usuario_id())
WITH CHECK (cliente_id = public.current_usuario_id());

-- Enable realtime for reservas and resenas
ALTER TABLE public.reservas REPLICA IDENTITY FULL;
ALTER TABLE public.resenas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resenas;