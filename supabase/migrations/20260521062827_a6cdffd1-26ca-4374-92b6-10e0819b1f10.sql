
-- Add provider live location columns
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS compartir_ubicacion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ubicacion_actualizada_at timestamptz;

-- Allow participants of a reserva to mark messages as read
DROP POLICY IF EXISTS "participantes marcan leido" ON public.mensajes;
CREATE POLICY "participantes marcan leido"
ON public.mensajes
FOR UPDATE
USING (
  reserva_id IN (
    SELECT r.id FROM public.reservas r
    WHERE r.cliente_id = current_usuario_id()
       OR r.prestador_id IN (SELECT p.id FROM public.prestadores p WHERE p.usuario_id = current_usuario_id())
  )
)
WITH CHECK (
  reserva_id IN (
    SELECT r.id FROM public.reservas r
    WHERE r.cliente_id = current_usuario_id()
       OR r.prestador_id IN (SELECT p.id FROM public.prestadores p WHERE p.usuario_id = current_usuario_id())
  )
);

-- Enable realtime on mensajes and prestadores
ALTER TABLE public.mensajes REPLICA IDENTITY FULL;
ALTER TABLE public.prestadores REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prestadores;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
