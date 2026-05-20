
-- 1) Columna verificado en prestadores
ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT false;

-- 2) Tabla pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  monto_total INTEGER NOT NULL CHECK (monto_total >= 0),
  monto_prestador INTEGER NOT NULL CHECK (monto_prestador >= 0),
  comision INTEGER NOT NULL CHECK (comision >= 0),
  moneda TEXT NOT NULL DEFAULT 'CLP',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON public.pagos(reserva_id);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Lectura: cliente o prestador de la reserva asociada
CREATE POLICY "participantes leen pagos"
  ON public.pagos
  FOR SELECT
  USING (
    reserva_id IN (
      SELECT r.id
      FROM public.reservas r
      WHERE r.cliente_id = public.current_usuario_id()
         OR r.prestador_id IN (
              SELECT p.id FROM public.prestadores p
              WHERE p.usuario_id = public.current_usuario_id()
            )
    )
  );

-- Inserción y actualización solo desde el sistema (service role bypasea RLS).
-- No se exponen policies para INSERT/UPDATE/DELETE desde clientes.
