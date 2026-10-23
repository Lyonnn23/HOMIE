-- ============================================================
-- Homie crecimiento: push (OneSignal vía pg_net), recordatorios (pg_cron),
-- calificación en ambos sentidos, cupones y referidos, favoritos con aviso,
-- chat con fotos, soporte en la app, métricas de embudo.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------- Configuración privada (claves de servicios) ----------------
CREATE TABLE IF NOT EXISTS public.config_privada (clave text PRIMARY KEY, valor text NOT NULL);
ALTER TABLE public.config_privada ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.config_privada FROM anon, authenticated;
-- Rellenar desde el panel de Lovable Cloud (SQL):
--   INSERT INTO public.config_privada VALUES ('onesignal_app_id','...'), ('onesignal_rest_key','...');

-- ---------------- Push: cada notificación nueva se envía por OneSignal ----------------
CREATE OR REPLACE FUNCTION public.enviar_push_onesignal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_app text; v_key text; v_uid uuid; v_cfg jsonb; v_url text;
BEGIN
  SELECT valor INTO v_app FROM public.config_privada WHERE clave = 'onesignal_app_id';
  SELECT valor INTO v_key FROM public.config_privada WHERE clave = 'onesignal_rest_key';
  IF v_app IS NULL OR v_key IS NULL THEN RETURN NEW; END IF;
  SELECT user_id, notif_config INTO v_uid, v_cfg FROM public.usuarios WHERE id = NEW.usuario_id;
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF COALESCE((v_cfg->>'push')::boolean, true) = false THEN RETURN NEW; END IF;
  v_url := CASE
    WHEN NEW.tipo = 'urgencia' THEN '/ya-prestador'
    WHEN NEW.tipo = 'solicitud' THEN '/cotizar'
    WHEN NEW.tipo = 'cotizacion' THEN '/solicitudes'
    WHEN NEW.tipo = 'reclamo' THEN '/reclamos'
    WHEN NEW.tipo = 'soporte' THEN '/soporte'
    WHEN NEW.tipo = 'pro' OR NEW.tipo = 'liquidacion' THEN '/panel'
    WHEN NEW.reserva_id IS NOT NULL THEN '/reservas'
    ELSE '/notificaciones' END;
  PERFORM net.http_post(
    url := 'https://onesignal.com/api/v1/notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Basic ' || v_key),
    body := jsonb_build_object(
      'app_id', v_app,
      'include_aliases', jsonb_build_object('external_id', jsonb_build_array(v_uid::text)),
      'target_channel', 'push',
      'headings', jsonb_build_object('es', NEW.titulo, 'en', NEW.titulo),
      'contents', jsonb_build_object('es', NEW.mensaje, 'en', NEW.mensaje),
      'url', v_url,
      'priority', CASE WHEN NEW.tipo = 'urgencia' THEN 10 ELSE 5 END
    )
  );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enviar_push_onesignal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_push_onesignal ON public.notificaciones;
CREATE TRIGGER trg_push_onesignal AFTER INSERT ON public.notificaciones
  FOR EACH ROW EXECUTE FUNCTION public.enviar_push_onesignal();

-- ---------------- Recordatorios automáticos (pg_cron, cada 15 min) ----------------
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS recordatorio_enviado boolean NOT NULL DEFAULT false;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS aviso_pago_enviado boolean NOT NULL DEFAULT false;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS aviso_resena_enviado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enviar_recordatorios()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_ahora timestamptz := now();
BEGIN
  -- 1) Mañana a esta hora: recordatorio a cliente y profesional (reservas confirmadas en las próximas 20–24 h)
  FOR r IN
    SELECT * FROM public.reservas
     WHERE estado = 'confirmada' AND recordatorio_enviado = false
       AND (fecha + hora) AT TIME ZONE 'America/Santiago' BETWEEN v_ahora + interval '20 hours' AND v_ahora + interval '24 hours'
  LOOP
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
    VALUES (r.cliente_id, 'recordatorio', 'Mañana tienes un servicio',
            COALESCE(r.prestador_nombre, 'Tu profesional') || ' llega mañana a las ' || to_char(r.hora, 'HH24:MI') || '. Tu código de confirmación está en Reservas.', r.id);
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
    SELECT p.usuario_id, 'recordatorio', 'Mañana tienes un trabajo',
           COALESCE(r.cliente_nombre, 'Un cliente') || ' te espera mañana a las ' || to_char(r.hora, 'HH24:MI') || ' en ' || r.direccion || '.', r.id
      FROM public.prestadores p WHERE p.id = r.prestador_id;
    UPDATE public.reservas SET recordatorio_enviado = true WHERE id = r.id;
  END LOOP;

  -- 2) Reserva sin pagar después de 30 min
  FOR r IN
    SELECT rs.* FROM public.reservas rs
     WHERE rs.estado = 'pendiente' AND rs.aviso_pago_enviado = false AND rs.created_at < v_ahora - interval '30 minutes'
       AND NOT EXISTS (SELECT 1 FROM public.pagos pg WHERE pg.reserva_id = rs.id AND pg.estado = 'pagado')
  LOOP
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
    VALUES (r.cliente_id, 'pago', 'Tu reserva sigue sin pagar',
            'Paga ahora para que ' || COALESCE(r.prestador_nombre, 'el profesional') || ' confirme tu hora. El pago queda protegido hasta que termine el trabajo.', r.id);
    UPDATE public.reservas SET aviso_pago_enviado = true WHERE id = r.id;
  END LOOP;

  -- 3) Pedir reseña 2 h después de completar
  FOR r IN
    SELECT rs.* FROM public.reservas rs
     WHERE rs.estado = 'completada' AND rs.aviso_resena_enviado = false
       AND COALESCE(rs.completada_at, rs.created_at) < v_ahora - interval '2 hours'
       AND NOT EXISTS (SELECT 1 FROM public.resenas x WHERE x.reserva_id = rs.id)
  LOOP
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
    VALUES (r.cliente_id, 'resena', '¿Cómo estuvo el servicio?',
            'Califica a ' || COALESCE(r.prestador_nombre, 'tu profesional') || ' en 10 segundos. Tu reseña ayuda a otros vecinos.', r.id);
    UPDATE public.reservas SET aviso_resena_enviado = true WHERE id = r.id;
  END LOOP;

  -- 4) Urgencias vencidas
  UPDATE public.urgencias SET estado = 'expirada' WHERE estado = 'buscando' AND expira_at < v_ahora;
  -- 5) Solicitudes vencidas
  UPDATE public.solicitudes SET estado = 'cerrada' WHERE estado = 'abierta' AND expira_at < v_ahora;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enviar_recordatorios() FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  PERFORM cron.unschedule('homie_recordatorios');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('homie_recordatorios', '*/15 * * * *', $$SELECT public.enviar_recordatorios();$$);

-- ---------------- Calificación del cliente por el profesional ----------------
CREATE TABLE IF NOT EXISTS public.calificaciones_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL UNIQUE REFERENCES public.reservas(id) ON DELETE CASCADE,
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  puntaje integer NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario text CHECK (comentario IS NULL OR char_length(comentario) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calificaciones_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prestador califica cliente" ON public.calificaciones_cliente;
CREATE POLICY "prestador califica cliente" ON public.calificaciones_cliente FOR INSERT TO authenticated
  WITH CHECK (
    prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id())
    AND EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = reserva_id AND r.prestador_id = calificaciones_cliente.prestador_id AND r.estado = 'completada')
  );
DROP POLICY IF EXISTS "lee calificaciones cliente" ON public.calificaciones_cliente;
CREATE POLICY "lee calificaciones cliente" ON public.calificaciones_cliente FOR SELECT TO authenticated
  USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id())
         OR cliente_id = public.current_usuario_id() OR public.is_admin());

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS calificacion_cliente numeric(2,1),
  ADD COLUMN IF NOT EXISTS calificaciones_cliente_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.recalc_calificacion_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.usuarios u SET
    calificacion_cliente = (SELECT ROUND(AVG(puntaje)::numeric, 1) FROM public.calificaciones_cliente WHERE cliente_id = NEW.cliente_id),
    calificaciones_cliente_count = (SELECT COUNT(*) FROM public.calificaciones_cliente WHERE cliente_id = NEW.cliente_id)
  WHERE u.id = NEW.cliente_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_recalc_calif_cliente ON public.calificaciones_cliente;
CREATE TRIGGER trg_recalc_calif_cliente AFTER INSERT ON public.calificaciones_cliente
  FOR EACH ROW EXECUTE FUNCTION public.recalc_calificacion_cliente();
-- La calificación del cliente es visible para profesionales en la reserva (vía reservas.cliente_calificacion)
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cliente_calificacion numeric(2,1);
CREATE OR REPLACE FUNCTION public.fill_reserva_cliente_calif()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT calificacion_cliente INTO NEW.cliente_calificacion FROM public.usuarios WHERE id = NEW.cliente_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_fill_reserva_cliente_calif ON public.reservas;
CREATE TRIGGER trg_fill_reserva_cliente_calif BEFORE INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.fill_reserva_cliente_calif();

-- ---------------- Cupones y referidos ----------------
CREATE TABLE IF NOT EXISTS public.cupones (
  codigo text PRIMARY KEY,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('monto','porcentaje')),
  valor integer NOT NULL CHECK (valor > 0),            -- CLP o %
  tope integer,                                          -- tope en CLP para porcentaje
  minimo integer NOT NULL DEFAULT 0,                     -- compra mínima (precio desde)
  usos_max integer,                                      -- total
  usos_por_usuario integer NOT NULL DEFAULT 1,
  usos integer NOT NULL DEFAULT 0,
  solo_primera_compra boolean NOT NULL DEFAULT false,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,  -- cupón personal (referidos)
  activo boolean NOT NULL DEFAULT true,
  vence_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin gestiona cupones" ON public.cupones;
CREATE POLICY "admin gestiona cupones" ON public.cupones FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "usuario lee sus cupones" ON public.cupones;
CREATE POLICY "usuario lee sus cupones" ON public.cupones FOR SELECT TO authenticated USING (usuario_id = public.current_usuario_id());

CREATE TABLE IF NOT EXISTS public.cupon_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL REFERENCES public.cupones(codigo) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
  descuento integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cupon_usos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lee mis usos" ON public.cupon_usos;
CREATE POLICY "lee mis usos" ON public.cupon_usos FOR SELECT TO authenticated USING (usuario_id = public.current_usuario_id() OR public.is_admin());

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cupon_codigo text;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS descuento integer NOT NULL DEFAULT 0;

-- Validar un cupón (sin aplicarlo): devuelve el descuento sobre la tarifa del cliente
CREATE OR REPLACE FUNCTION public.validar_cupon(_codigo text, _precio integer)
RETURNS TABLE (valido boolean, descuento integer, mensaje text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_me uuid := public.current_usuario_id(); v_usos int; v_desc int;
BEGIN
  SELECT * INTO c FROM public.cupones WHERE upper(codigo) = upper(trim(_codigo));
  IF c IS NULL OR NOT c.activo THEN RETURN QUERY SELECT false, 0, 'Cupón no válido'; RETURN; END IF;
  IF c.vence_at IS NOT NULL AND c.vence_at < now() THEN RETURN QUERY SELECT false, 0, 'Cupón vencido'; RETURN; END IF;
  IF c.usos_max IS NOT NULL AND c.usos >= c.usos_max THEN RETURN QUERY SELECT false, 0, 'Cupón agotado'; RETURN; END IF;
  IF c.usuario_id IS NOT NULL AND c.usuario_id <> v_me THEN RETURN QUERY SELECT false, 0, 'Este cupón es personal'; RETURN; END IF;
  IF _precio < c.minimo THEN RETURN QUERY SELECT false, 0, 'Válido para servicios desde $' || to_char(c.minimo, 'FM999G999G999'); RETURN; END IF;
  SELECT COUNT(*) INTO v_usos FROM public.cupon_usos WHERE codigo = c.codigo AND usuario_id = v_me;
  IF v_usos >= c.usos_por_usuario THEN RETURN QUERY SELECT false, 0, 'Ya usaste este cupón'; RETURN; END IF;
  IF c.solo_primera_compra AND EXISTS (SELECT 1 FROM public.reservas r JOIN public.pagos p ON p.reserva_id = r.id AND p.estado = 'pagado' WHERE r.cliente_id = v_me) THEN
    RETURN QUERY SELECT false, 0, 'Solo para tu primera reserva'; RETURN;
  END IF;
  v_desc := CASE WHEN c.tipo = 'monto' THEN c.valor ELSE ROUND(_precio * c.valor / 100.0) END;
  IF c.tope IS NOT NULL THEN v_desc := LEAST(v_desc, c.tope); END IF;
  v_desc := LEAST(v_desc, _precio);
  RETURN QUERY SELECT true, v_desc, COALESCE(c.descripcion, 'Descuento aplicado');
END; $$;
GRANT EXECUTE ON FUNCTION public.validar_cupon(text, integer) TO authenticated;

-- Aplicar cupón al crear la reserva: el trigger de precio descuenta del total y registra el uso
CREATE OR REPLACE FUNCTION public.aplicar_cupon_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  IF NEW.cupon_codigo IS NULL OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v FROM public.validar_cupon(NEW.cupon_codigo, NEW.total - NEW.comision);
  IF NOT v.valido THEN RAISE EXCEPTION '%', v.mensaje; END IF;
  NEW.descuento := v.descuento;
  NEW.total := GREATEST(NEW.total - v.descuento, NEW.comision);
  NEW.cupon_codigo := upper(trim(NEW.cupon_codigo));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_aplicar_cupon ON public.reservas;
-- Debe correr DESPUÉS de fill_reserva_total (orden alfabético de triggers BEFORE): "trg_fill_reserva_total" < "trg_z_aplicar_cupon"
CREATE TRIGGER trg_z_aplicar_cupon BEFORE INSERT ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.aplicar_cupon_reserva();

CREATE OR REPLACE FUNCTION public.registrar_uso_cupon()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cupon_codigo IS NOT NULL AND NEW.descuento > 0 THEN
    INSERT INTO public.cupon_usos (codigo, usuario_id, reserva_id, descuento) VALUES (NEW.cupon_codigo, NEW.cliente_id, NEW.id, NEW.descuento);
    UPDATE public.cupones SET usos = usos + 1 WHERE codigo = NEW.cupon_codigo;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_registrar_uso_cupon ON public.reservas;
CREATE TRIGGER trg_registrar_uso_cupon AFTER INSERT ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.registrar_uso_cupon();

-- Referidos: cada usuario tiene un código; quien se registra con él recibe $3.000 y el que invita recibe $3.000 cuando el invitado completa su primer servicio pagado
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS codigo_referido text UNIQUE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS referido_por uuid REFERENCES public.usuarios(id);
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS bono_referido_pagado boolean NOT NULL DEFAULT false;
UPDATE public.usuarios SET codigo_referido = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)) WHERE codigo_referido IS NULL;

CREATE OR REPLACE FUNCTION public.gen_codigo_referido()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_referido IS NULL THEN NEW.codigo_referido := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)); END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_gen_codigo_referido ON public.usuarios;
CREATE TRIGGER trg_gen_codigo_referido BEFORE INSERT ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.gen_codigo_referido();

CREATE OR REPLACE FUNCTION public.usar_codigo_referido(_codigo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me record; v_ref record; v_cupon text;
BEGIN
  SELECT * INTO v_me FROM public.usuarios WHERE id = public.current_usuario_id();
  IF v_me.referido_por IS NOT NULL THEN RAISE EXCEPTION 'Ya usaste un código de invitación'; END IF;
  IF v_me.created_at < now() - interval '7 days' THEN RAISE EXCEPTION 'El código solo se puede usar en tu primera semana'; END IF;
  SELECT * INTO v_ref FROM public.usuarios WHERE upper(codigo_referido) = upper(trim(_codigo));
  IF v_ref IS NULL OR v_ref.id = v_me.id THEN RAISE EXCEPTION 'Código no válido'; END IF;
  UPDATE public.usuarios SET referido_por = v_ref.id WHERE id = v_me.id;
  v_cupon := 'BIENVENIDA-' || v_me.codigo_referido;
  INSERT INTO public.cupones (codigo, descripcion, tipo, valor, minimo, usuario_id, solo_primera_compra, vence_at)
  VALUES (v_cupon, 'Regalo de bienvenida de ' || split_part(v_ref.nombre, ' ', 1), 'monto', 3000, 10000, v_me.id, true, now() + interval '60 days')
  ON CONFLICT (codigo) DO NOTHING;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  VALUES (v_me.id, 'cupon', 'Tienes $3.000 de regalo', 'Usa el cupón ' || v_cupon || ' en tu primera reserva.');
  RETURN v_cupon;
END; $$;
GRANT EXECUTE ON FUNCTION public.usar_codigo_referido(text) TO authenticated;

-- Bono al que invita: cuando el invitado completa su primer servicio pagado
CREATE OR REPLACE FUNCTION public.bono_referidor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cli record; v_cupon text;
BEGIN
  IF NEW.estado <> 'completada' OR OLD.estado = 'completada' THEN RETURN NEW; END IF;
  SELECT * INTO v_cli FROM public.usuarios WHERE id = NEW.cliente_id;
  IF v_cli.referido_por IS NULL OR v_cli.bono_referido_pagado THEN RETURN NEW; END IF;
  UPDATE public.usuarios SET bono_referido_pagado = true WHERE id = v_cli.id;
  v_cupon := 'GRACIAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.cupones (codigo, descripcion, tipo, valor, minimo, usuario_id, vence_at)
  VALUES (v_cupon, 'Gracias por invitar a ' || split_part(v_cli.nombre, ' ', 1), 'monto', 3000, 10000, v_cli.referido_por, now() + interval '90 days');
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  VALUES (v_cli.referido_por, 'cupon', 'Ganaste $3.000', split_part(v_cli.nombre, ' ', 1) || ' completó su primer servicio. Usa el cupón ' || v_cupon || '.');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bono_referidor ON public.reservas;
CREATE TRIGGER trg_bono_referidor AFTER UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.bono_referidor();

-- Cupón de lanzamiento (edítalo o desactívalo desde /admin/cupones)
INSERT INTO public.cupones (codigo, descripcion, tipo, valor, tope, minimo, usos_max, solo_primera_compra, vence_at)
VALUES ('HOMIE20', '20% de descuento en tu primera reserva', 'porcentaje', 20, 10000, 10000, 500, true, now() + interval '90 days')
ON CONFLICT DO NOTHING;

-- ---------------- Favoritos: aviso cuando el profesional se pone disponible ----------------
CREATE OR REPLACE FUNCTION public.notify_favorito_disponible()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.disponible_ahora = true AND OLD.disponible_ahora = false THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    SELECT f.cliente_id, 'favorito', COALESCE(NEW.nombre, 'Tu profesional favorito') || ' está disponible ahora',
           'Reserva antes de que se llene su agenda.'
      FROM public.favoritos f JOIN public.usuarios u ON u.id = f.cliente_id
     WHERE f.prestador_id = NEW.id AND COALESCE((u.notif_config->>'favorito_disponible')::boolean, true);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_favorito ON public.prestadores;
CREATE TRIGGER trg_notify_favorito AFTER UPDATE OF disponible_ahora ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.notify_favorito_disponible();

-- ---------------- Chat con fotos y ubicación ----------------
ALTER TABLE public.mensajes ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE public.mensajes ADD COLUMN IF NOT EXISTS lat numeric(9,6);
ALTER TABLE public.mensajes ADD COLUMN IF NOT EXISTS lng numeric(9,6);
INSERT INTO storage.buckets (id, name, public) VALUES ('chat','chat', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "chat owner insert" ON storage.objects;
CREATE POLICY "chat owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "chat participantes leen" ON storage.objects;
CREATE POLICY "chat participantes leen" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM public.reservas r
                WHERE r.id::text = (storage.foldername(name))[2]
                  AND (r.cliente_id = public.current_usuario_id()
                       OR r.prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id())))
  ));
-- Avisar al otro participante de un mensaje nuevo
CREATE OR REPLACE FUNCTION public.notify_mensaje()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_dest uuid; v_nombre text;
BEGIN
  SELECT * INTO r FROM public.reservas WHERE id = NEW.reserva_id;
  IF r IS NULL THEN RETURN NEW; END IF;
  IF NEW.remitente_id = r.cliente_id THEN
    SELECT usuario_id INTO v_dest FROM public.prestadores WHERE id = r.prestador_id; v_nombre := r.cliente_nombre;
  ELSE
    v_dest := r.cliente_id; v_nombre := r.prestador_nombre;
  END IF;
  IF v_dest IS NOT NULL THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id)
    VALUES (v_dest, 'mensaje', 'Mensaje de ' || COALESCE(v_nombre, 'Homie'),
            CASE WHEN NEW.foto_url IS NOT NULL THEN '📷 Foto' WHEN NEW.lat IS NOT NULL THEN '📍 Ubicación' ELSE left(NEW.contenido, 120) END, r.id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_mensaje ON public.mensajes;
CREATE TRIGGER trg_notify_mensaje AFTER INSERT ON public.mensajes FOR EACH ROW EXECUTE FUNCTION public.notify_mensaje();

-- ---------------- Soporte dentro de la app ----------------
CREATE TABLE IF NOT EXISTS public.soporte_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  de_admin boolean NOT NULL DEFAULT false,
  contenido text NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 2000),
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_soporte_usuario ON public.soporte_mensajes(usuario_id, created_at);
ALTER TABLE public.soporte_mensajes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuario escribe soporte" ON public.soporte_mensajes;
CREATE POLICY "usuario escribe soporte" ON public.soporte_mensajes FOR INSERT TO authenticated
  WITH CHECK ((usuario_id = public.current_usuario_id() AND de_admin = false) OR public.is_admin());
DROP POLICY IF EXISTS "lee soporte" ON public.soporte_mensajes;
CREATE POLICY "lee soporte" ON public.soporte_mensajes FOR SELECT TO authenticated
  USING (usuario_id = public.current_usuario_id() OR public.is_admin());
DROP POLICY IF EXISTS "marca leido soporte" ON public.soporte_mensajes;
CREATE POLICY "marca leido soporte" ON public.soporte_mensajes FOR UPDATE TO authenticated
  USING (usuario_id = public.current_usuario_id() OR public.is_admin());
CREATE OR REPLACE FUNCTION public.notify_soporte()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.de_admin THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    VALUES (NEW.usuario_id, 'soporte', 'Respuesta de Homie', left(NEW.contenido, 120));
  ELSE
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
    SELECT ur.user_id_usuario, 'soporte', 'Nuevo mensaje de soporte', left(NEW.contenido, 120)
      FROM (SELECT u.id AS user_id_usuario FROM public.user_roles r JOIN public.usuarios u ON u.user_id = r.user_id WHERE r.role IN ('admin','superadmin')) ur;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_soporte ON public.soporte_mensajes;
CREATE TRIGGER trg_notify_soporte AFTER INSERT ON public.soporte_mensajes FOR EACH ROW EXECUTE FUNCTION public.notify_soporte();

-- ---------------- Métricas de embudo (admin) ----------------
CREATE OR REPLACE FUNCTION public.admin_embudo(_dias integer DEFAULT 30)
RETURNS TABLE (
  registros int, clientes int, prestadores_registrados int, prestadores_con_perfil int, prestadores_verificados int,
  reservas_creadas int, reservas_pagadas int, reservas_completadas int, reservas_canceladas int,
  solicitudes int, cotizaciones int, urgencias int, urgencias_asignadas int,
  ingresos int, comisiones int, ticket_promedio int, pro_activos int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (SELECT now() - make_interval(days => _dias) AS desde)
  SELECT
    (SELECT COUNT(*)::int FROM public.usuarios, d WHERE created_at >= d.desde),
    (SELECT COUNT(*)::int FROM public.usuarios, d WHERE created_at >= d.desde AND tipo = 'cliente'),
    (SELECT COUNT(*)::int FROM public.usuarios, d WHERE created_at >= d.desde AND tipo = 'prestador'),
    (SELECT COUNT(*)::int FROM public.prestadores p JOIN public.usuarios u ON u.id = p.usuario_id, d WHERE u.created_at >= d.desde),
    (SELECT COUNT(*)::int FROM public.prestadores p JOIN public.usuarios u ON u.id = p.usuario_id, d WHERE u.created_at >= d.desde AND p.verificado),
    (SELECT COUNT(*)::int FROM public.reservas, d WHERE created_at >= d.desde),
    (SELECT COUNT(DISTINCT reserva_id)::int FROM public.pagos, d WHERE created_at >= d.desde AND estado IN ('pagado','reembolsado')),
    (SELECT COUNT(*)::int FROM public.reservas, d WHERE created_at >= d.desde AND estado = 'completada'),
    (SELECT COUNT(*)::int FROM public.reservas, d WHERE created_at >= d.desde AND estado = 'cancelada'),
    (SELECT COUNT(*)::int FROM public.solicitudes, d WHERE created_at >= d.desde),
    (SELECT COUNT(*)::int FROM public.cotizaciones, d WHERE created_at >= d.desde),
    (SELECT COUNT(*)::int FROM public.urgencias, d WHERE created_at >= d.desde),
    (SELECT COUNT(*)::int FROM public.urgencias, d WHERE created_at >= d.desde AND estado = 'asignada'),
    (SELECT COALESCE(SUM(monto_total),0)::int FROM public.pagos, d WHERE created_at >= d.desde AND estado = 'pagado'),
    (SELECT COALESCE(SUM(comision),0)::int FROM public.pagos, d WHERE created_at >= d.desde AND estado = 'pagado'),
    (SELECT COALESCE(ROUND(AVG(monto_total)),0)::int FROM public.pagos, d WHERE created_at >= d.desde AND estado = 'pagado'),
    (SELECT COUNT(*)::int FROM public.prestadores WHERE pro_hasta > now())
  WHERE public.is_admin();
$$;
REVOKE EXECUTE ON FUNCTION public.admin_embudo(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_embudo(integer) TO authenticated;

-- Serie diaria para gráficos del admin
CREATE OR REPLACE FUNCTION public.admin_serie_diaria(_dias integer DEFAULT 30)
RETURNS TABLE (dia date, registros int, reservas int, pagos int, ingresos int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.dia::date,
    (SELECT COUNT(*)::int FROM public.usuarios u WHERE u.created_at::date = g.dia::date),
    (SELECT COUNT(*)::int FROM public.reservas r WHERE r.created_at::date = g.dia::date),
    (SELECT COUNT(*)::int FROM public.pagos p WHERE p.created_at::date = g.dia::date AND p.estado = 'pagado'),
    (SELECT COALESCE(SUM(monto_total),0)::int FROM public.pagos p WHERE p.created_at::date = g.dia::date AND p.estado = 'pagado')
  FROM generate_series((CURRENT_DATE - make_interval(days => _dias - 1))::timestamp, CURRENT_DATE::timestamp, interval '1 day') AS g(dia)
  WHERE public.is_admin();
$$;
REVOKE EXECUTE ON FUNCTION public.admin_serie_diaria(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_serie_diaria(integer) TO authenticated;
