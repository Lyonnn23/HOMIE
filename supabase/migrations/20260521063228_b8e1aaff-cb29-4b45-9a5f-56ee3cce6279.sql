
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS notif_config jsonb NOT NULL DEFAULT '{
    "master": true,
    "reserva_recibida": true,
    "reserva_confirmada": true,
    "reserva_rechazada": true,
    "en_camino": true,
    "completada": true,
    "recordatorio": true,
    "favorito_disponible": true,
    "marketing": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS onesignal_player_id text;
