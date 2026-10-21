DROP POLICY IF EXISTS "perfiles public read" ON storage.objects;
DROP POLICY IF EXISTS "perfiles owner read" ON storage.objects;
CREATE POLICY "perfiles owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'perfiles' AND owner_id = (SELECT auth.uid()::text));
COMMENT ON POLICY "perfiles owner read" ON storage.objects IS 'Object listing and authenticated reads belong to the uploader. Public profile images continue to use public URLs when the bucket is configured public.';