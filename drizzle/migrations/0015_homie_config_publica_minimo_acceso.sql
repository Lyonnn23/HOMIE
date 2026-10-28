-- Public readers need SELECT only; database policies remain the admin edit boundary.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.config_publica FROM anon;
GRANT SELECT ON public.config_publica TO anon;
REVOKE EXECUTE ON FUNCTION public.al_verificar_prestador() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.al_verificar_prestador() TO service_role;