-- Narrow inherited privileges on the new growth tables after provisioning.
REVOKE ALL ON public.calificaciones_cliente, public.cupones, public.cupon_usos, public.soporte_mensajes FROM anon, authenticated;
GRANT SELECT, INSERT ON public.calificaciones_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cupones TO authenticated;
GRANT SELECT ON public.cupon_usos TO authenticated;
GRANT SELECT, INSERT ON public.soporte_mensajes TO authenticated;
GRANT UPDATE (leido) ON public.soporte_mensajes TO authenticated;
GRANT ALL ON public.calificaciones_cliente, public.cupones, public.cupon_usos, public.soporte_mensajes TO service_role;

-- Also enforce immutable support fields in case infrastructure widens table grants.
CREATE OR REPLACE FUNCTION public.protect_soporte_mensaje()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
    OR NEW.de_admin IS DISTINCT FROM OLD.de_admin
    OR NEW.contenido IS DISTINCT FROM OLD.contenido
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Solo se puede actualizar la lectura de un mensaje de soporte';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_protect_soporte_mensaje BEFORE UPDATE ON public.soporte_mensajes
  FOR EACH ROW EXECUTE FUNCTION public.protect_soporte_mensaje();
REVOKE EXECUTE ON FUNCTION public.protect_soporte_mensaje() FROM PUBLIC, anon, authenticated;