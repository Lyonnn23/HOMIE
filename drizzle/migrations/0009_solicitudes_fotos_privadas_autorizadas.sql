CREATE OR REPLACE FUNCTION public.puede_leer_foto_solicitud(_object_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.solicitudes s
    JOIN public.usuarios u ON u.id = s.cliente_id
    WHERE u.user_id::text = split_part(_object_path, '/', 1)
      AND EXISTS (
        SELECT 1 FROM unnest(s.fotos) f
        WHERE f = _object_path
          OR split_part(f, '/storage/v1/object/public/solicitudes/', 2) = _object_path
      )
      AND (
        s.cliente_id = public.current_usuario_id()
        OR public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.cotizaciones c
          JOIN public.prestadores p ON p.id = c.prestador_id
          WHERE c.solicitud_id = s.id AND p.usuario_id = public.current_usuario_id()
            AND p.verificado AND NOT p.suspendido
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.puede_leer_foto_solicitud(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_leer_foto_solicitud(text) TO authenticated;

DROP POLICY IF EXISTS "solicitudes public read" ON storage.objects;
DROP POLICY IF EXISTS "solicitudes authorized read" ON storage.objects;
CREATE POLICY "solicitudes authorized read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'solicitudes'
  AND ((owner_id = (SELECT auth.uid()::text)) OR public.puede_leer_foto_solicitud(name))
);

DROP POLICY IF EXISTS "solicitudes owner delete" ON storage.objects;
CREATE POLICY "solicitudes owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'solicitudes' AND owner_id = (SELECT auth.uid()::text));