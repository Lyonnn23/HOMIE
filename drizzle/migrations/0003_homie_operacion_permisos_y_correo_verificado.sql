GRANT ALL ON public.admin_emails TO service_role;
GRANT SELECT ON public.reserva_codigos TO authenticated;
GRANT ALL ON public.reserva_codigos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidaciones TO authenticated;
GRANT ALL ON public.liquidaciones TO service_role;
ALTER VIEW public.saldos_prestadores SET (security_invoker = true);
REVOKE EXECUTE ON FUNCTION public.admin_resumen() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_admin_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_codigo_reserva() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.asignar_admin_por_email(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(_email) AND email_confirmed_at IS NOT NULL LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'superadmin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.asignar_admin_por_email(text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.auto_admin_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_emails WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_admin_confirmado ON auth.users;
CREATE TRIGGER trg_auto_admin_confirmado AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.auto_admin_on_signup();