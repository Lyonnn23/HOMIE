
CREATE TABLE public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  reserva_id uuid,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_usuario ON public.notificaciones(usuario_id, created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifs" ON public.notificaciones
  FOR SELECT USING (usuario_id = public.current_usuario_id());

CREATE POLICY "users update own notifs" ON public.notificaciones
  FOR UPDATE USING (usuario_id = public.current_usuario_id());

-- Allow triggers/system to insert (definer functions); deny direct client inserts
CREATE POLICY "system insert notifs" ON public.notificaciones
  FOR INSERT WITH CHECK (false);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
ALTER TABLE public.notificaciones REPLICA IDENTITY FULL;

-- Trigger: nueva reserva → notificar al prestador
CREATE OR REPLACE FUNCTION public.notify_nueva_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prest_usuario uuid;
  v_cliente_nombre text;
BEGIN
  SELECT usuario_id INTO v_prest_usuario FROM public.prestadores WHERE id = NEW.prestador_id;
  SELECT nombre INTO v_cliente_nombre FROM public.usuarios WHERE id = NEW.cliente_id;
  IF v_prest_usuario IS NOT NULL THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
    VALUES (v_prest_usuario, 'nueva_reserva', 'Nueva reserva',
            COALESCE(v_cliente_nombre,'Un cliente') || ' solicitó un servicio para el ' || to_char(NEW.fecha,'DD/MM') || ' a las ' || to_char(NEW.hora,'HH24:MI'),
            NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_nueva_reserva
AFTER INSERT ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.notify_nueva_reserva();

-- Trigger: cambio de estado → notificar al cliente
CREATE OR REPLACE FUNCTION public.notify_estado_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cliente_user uuid;
  v_prest_nombre text;
  v_titulo text;
  v_msg text;
BEGIN
  IF NEW.estado = OLD.estado THEN RETURN NEW; END IF;
  SELECT u.user_id INTO v_cliente_user FROM public.usuarios u WHERE u.id = NEW.cliente_id;
  SELECT u.nombre INTO v_prest_nombre
    FROM public.prestadores p JOIN public.usuarios u ON u.id = p.usuario_id
    WHERE p.id = NEW.prestador_id;

  CASE NEW.estado::text
    WHEN 'confirmada' THEN v_titulo := 'Reserva confirmada';
      v_msg := COALESCE(v_prest_nombre,'El prestador') || ' aceptó tu reserva';
    WHEN 'rechazada' THEN v_titulo := 'Reserva rechazada';
      v_msg := COALESCE(v_prest_nombre,'El prestador') || ' no pudo aceptar tu reserva';
    WHEN 'en_camino' THEN v_titulo := 'En camino';
      v_msg := COALESCE(v_prest_nombre,'El prestador') || ' va en camino';
    WHEN 'completada' THEN v_titulo := 'Servicio completado';
      v_msg := '¡Listo! Cuéntanos cómo te fue dejando una reseña';
    WHEN 'cancelada' THEN v_titulo := 'Reserva cancelada';
      v_msg := 'La reserva fue cancelada';
    ELSE RETURN NEW;
  END CASE;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
  SELECT id, 'estado_' || NEW.estado::text, v_titulo, v_msg, NEW.id
  FROM public.usuarios WHERE id = NEW.cliente_id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_estado_reserva
AFTER UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.notify_estado_reserva();
