
ALTER TABLE public.reportes
  DROP CONSTRAINT IF EXISTS reportes_reportante_id_fkey,
  ADD CONSTRAINT reportes_reportante_id_fkey
    FOREIGN KEY (reportante_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.reportes
  DROP CONSTRAINT IF EXISTS reportes_reportado_id_fkey,
  ADD CONSTRAINT reportes_reportado_id_fkey
    FOREIGN KEY (reportado_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.reportes
  DROP CONSTRAINT IF EXISTS reportes_reserva_id_fkey,
  ADD CONSTRAINT reportes_reserva_id_fkey
    FOREIGN KEY (reserva_id) REFERENCES public.reservas(id) ON DELETE CASCADE;
