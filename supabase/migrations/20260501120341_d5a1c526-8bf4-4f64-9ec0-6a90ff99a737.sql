-- Habilitar RLS se não estiver habilitado
ALTER TABLE public.mro_orders ENABLE ROW LEVEL SECURITY;

-- Criar política que permite a qualquer um ler os dados (necessário para o painel administrativo atual)
-- Nota: No futuro, isso pode ser restringido para apenas usuários autenticados se desejado.
DROP POLICY IF EXISTS "Permitir leitura pública de mro_orders" ON public.mro_orders;
CREATE POLICY "Permitir leitura pública de mro_orders" ON public.mro_orders FOR SELECT USING (true);
