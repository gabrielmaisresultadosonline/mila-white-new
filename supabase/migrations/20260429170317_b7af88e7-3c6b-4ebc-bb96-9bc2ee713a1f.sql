-- Add new columns to whatsapp_page_settings
ALTER TABLE public.whatsapp_page_settings 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS is_direct_button BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS options_title TEXT DEFAULT 'Sobre o que deseja falar?';

-- Ensure storage bucket exists and is public for assets
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('whatsapp-assets', 'whatsapp-assets', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Policies for the new bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'whatsapp-assets');
CREATE POLICY "Admin Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'whatsapp-assets');
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE USING (bucket_id = 'whatsapp-assets');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'whatsapp-assets');
