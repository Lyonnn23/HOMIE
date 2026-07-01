
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS pagos_mp_preference_id_idx ON public.pagos(mp_preference_id);
CREATE INDEX IF NOT EXISTS pagos_mp_payment_id_idx ON public.pagos(mp_payment_id);
CREATE INDEX IF NOT EXISTS pagos_reserva_id_idx ON public.pagos(reserva_id);
