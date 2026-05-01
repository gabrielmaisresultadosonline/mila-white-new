-- Allow anon/authenticated uploads to assets bucket (admin UI uses anon key)
CREATE POLICY "Public can upload to assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Public can update assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets');

CREATE POLICY "Public can delete assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets');