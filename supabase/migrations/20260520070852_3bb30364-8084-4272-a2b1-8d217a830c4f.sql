
CREATE TABLE public.mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL,
  remitente_id uuid NOT NULL,
  contenido text NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensajes_reserva ON public.mensajes(reserva_id, created_at);

ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participantes leen mensajes" ON public.mensajes
  FOR SELECT USING (
    reserva_id IN (
      SELECT r.id FROM public.reservas r
      WHERE r.cliente_id = public.current_usuario_id()
         OR r.prestador_id IN (SELECT p.id FROM public.prestadores p WHERE p.usuario_id = public.current_usuario_id())
    )
  );

CREATE POLICY "participantes envian mensajes" ON public.mensajes
  FOR INSERT WITH CHECK (
    remitente_id = public.current_usuario_id()
    AND reserva_id IN (
      SELECT r.id FROM public.reservas r
      WHERE r.cliente_id = public.current_usuario_id()
         OR r.prestador_id IN (SELECT p.id FROM public.prestadores p WHERE p.usuario_id = public.current_usuario_id())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
ALTER TABLE public.mensajes REPLICA IDENTITY FULL;
