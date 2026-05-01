-- Allow public read/write on admin/ folder of user-data bucket so the admin panel can save announcements
CREATE POLICY "Public read user-data admin"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-data');

CREATE POLICY "Public insert user-data admin"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-data');

CREATE POLICY "Public update user-data admin"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-data')
WITH CHECK (bucket_id = 'user-data');

CREATE POLICY "Public delete user-data admin"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-data');