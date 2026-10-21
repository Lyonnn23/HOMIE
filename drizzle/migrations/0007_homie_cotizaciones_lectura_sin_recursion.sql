-- These viewer-bound helpers break the solicitudes/cotizaciones RLS cycle without exposing arbitrary row contents.
CREATE OR REPLACE FUNCTION public.solicitud_es_del_cliente_actual(_solicitud_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT EXISTS (SELECT 1 FROM public.solicitudes WHERE id = _solicitud_id AND cliente_id = public.current_usuario_id());
$$;
REVOKE EXECUTE ON FUNCTION public.solicitud_es_del_cliente_actual(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitud_es_del_cliente_actual(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.solicitud_tiene_cotizacion_del_prestador_actual(_solicitud_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT EXISTS (SELECT 1 FROM public.cotizaciones c JOIN public.prestadores p ON p.id = c.prestador_id WHERE c.solicitud_id = _solicitud_id AND p.usuario_id = public.current_usuario_id());
$$;
REVOKE EXECUTE ON FUNCTION public.solicitud_tiene_cotizacion_del_prestador_actual(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitud_tiene_cotizacion_del_prestador_actual(uuid) TO authenticated;
DROP POLICY IF EXISTS "lee solicitudes" ON public.solicitudes;
CREATE POLICY "lee solicitudes" ON public.solicitudes FOR SELECT TO authenticated
USING (
cliente_id = public.current_usuario_id() OR public.is_admin()
OR (estado = 'abierta' AND expira_at > now() AND categoria_id IN (SELECT categoria_id FROM public.prestadores WHERE usuario_id = public.current_usuario_id() AND verificado = true AND suspendido = false))
OR public.solicitud_tiene_cotizacion_del_prestador_actual(id)
);
DROP POLICY IF EXISTS "lee cotizaciones" ON public.cotizaciones;
CREATE POLICY "lee cotizaciones" ON public.cotizaciones FOR SELECT TO authenticated
USING (prestador_id IN (SELECT id FROM public.prestadores WHERE usuario_id = public.current_usuario_id()) OR public.solicitud_es_del_cliente_actual(solicitud_id) OR public.is_admin());
REVOKE EXECUTE ON FUNCTION public.validar_cambio_cotizacion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_nueva_solicitud() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_nueva_cotizacion() FROM PUBLIC, anon, authenticated;