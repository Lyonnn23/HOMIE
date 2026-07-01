
-- 1) Denormalize nombre + foto en prestadores (tabla pública)
ALTER TABLE public.prestadores ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE public.prestadores ADD COLUMN IF NOT EXISTS foto_url text;

UPDATE public.prestadores p
   SET nombre = u.nombre, foto_url = u.foto_url
  FROM public.usuarios u
 WHERE u.id = p.usuario_id;

CREATE OR REPLACE FUNCTION public.fill_prestador_denorm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.nombre IS NULL OR NEW.foto_url IS NULL THEN
    SELECT nombre, foto_url INTO NEW.nombre, NEW.foto_url
      FROM public.usuarios WHERE id = NEW.usuario_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_fill_prestador_denorm ON public.prestadores;
CREATE TRIGGER trg_fill_prestador_denorm
BEFORE INSERT ON public.prestadores
FOR EACH ROW EXECUTE FUNCTION public.fill_prestador_denorm();

CREATE OR REPLACE FUNCTION public.sync_prestador_from_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.prestadores
     SET nombre = NEW.nombre, foto_url = NEW.foto_url
   WHERE usuario_id = NEW.id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_prestador_from_usuario ON public.usuarios;
CREATE TRIGGER trg_sync_prestador_from_usuario
AFTER UPDATE OF nombre, foto_url ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.sync_prestador_from_usuario();

-- 2) Denormalize en reservas
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cliente_nombre text;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cliente_foto_url text;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS prestador_nombre text;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS prestador_foto_url text;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS prestador_usuario_id uuid;

UPDATE public.reservas r
   SET cliente_nombre = uc.nombre,
       cliente_foto_url = uc.foto_url,
       prestador_nombre = p.nombre,
       prestador_foto_url = p.foto_url,
       prestador_usuario_id = p.usuario_id
  FROM public.usuarios uc, public.prestadores p
 WHERE uc.id = r.cliente_id AND p.id = r.prestador_id;

CREATE OR REPLACE FUNCTION public.fill_reserva_denorm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT nombre, foto_url INTO NEW.cliente_nombre, NEW.cliente_foto_url
    FROM public.usuarios WHERE id = NEW.cliente_id;
  SELECT nombre, foto_url, usuario_id
    INTO NEW.prestador_nombre, NEW.prestador_foto_url, NEW.prestador_usuario_id
    FROM public.prestadores WHERE id = NEW.prestador_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_fill_reserva_denorm ON public.reservas;
CREATE TRIGGER trg_fill_reserva_denorm
BEFORE INSERT ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.fill_reserva_denorm();

-- 3) Denormalize cliente_nombre en resenas
ALTER TABLE public.resenas ADD COLUMN IF NOT EXISTS cliente_nombre text;
UPDATE public.resenas r
   SET cliente_nombre = u.nombre
  FROM public.usuarios u
 WHERE u.id = r.cliente_id;

CREATE OR REPLACE FUNCTION public.fill_resena_denorm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cliente_nombre IS NULL THEN
    SELECT nombre INTO NEW.cliente_nombre FROM public.usuarios WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_fill_resena_denorm ON public.resenas;
CREATE TRIGGER trg_fill_resena_denorm
BEFORE INSERT ON public.resenas
FOR EACH ROW EXECUTE FUNCTION public.fill_resena_denorm();

-- 4) Restrict RLS on reservas
DROP POLICY IF EXISTS "public read reservas" ON public.reservas;
CREATE POLICY "participantes leen reservas"
  ON public.reservas FOR SELECT
  USING (
    cliente_id = public.current_usuario_id()
    OR prestador_id IN (
      SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()
    )
    OR public.is_admin()
  );

-- 5) Restrict RLS on usuarios
DROP POLICY IF EXISTS "public read usuarios" ON public.usuarios;
CREATE POLICY "usuario lee su propia fila"
  ON public.usuarios FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
