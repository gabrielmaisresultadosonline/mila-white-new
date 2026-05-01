DROP POLICY IF EXISTS "Service role only on whatsapp_page_settings" ON public.whatsapp_page_settings;

CREATE POLICY "Allow public read on whatsapp_page_settings"
  ON public.whatsapp_page_settings FOR SELECT USING (true);

CREATE POLICY "Allow public insert on whatsapp_page_settings"
  ON public.whatsapp_page_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on whatsapp_page_settings"
  ON public.whatsapp_page_settings FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.whatsapp_page_settings (
  whatsapp_number, page_title, page_subtitle, profile_photo_url,
  is_direct_button, options_title, button_text, whatsapp_message
)
SELECT '', 'Gabriel está disponível agora para te ajudar',
       'Sobre o que gostaria de falar clique no botão abaixo.',
       '', false, 'Sobre o que deseja falar?',
       'FALAR NO WHATSAPP',
       'Olá, gostaria de saber mais sobre o Código InstaShop'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_page_settings);