
-- 1. Tabela de auditoria (log de tudo que acontece com paid_users)
CREATE TABLE IF NOT EXISTS public.paid_users_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL,
  paid_user_id UUID,
  email TEXT,
  username TEXT,
  old_data JSONB,
  new_data JSONB,
  performed_by TEXT,
  session_user_name TEXT,
  application_name TEXT,
  client_addr TEXT,
  statement_query TEXT,
  rows_affected_in_stmt INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paid_users_audit_created ON public.paid_users_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paid_users_audit_op ON public.paid_users_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_paid_users_audit_email ON public.paid_users_audit_log(email);

GRANT SELECT ON public.paid_users_audit_log TO authenticated;
GRANT ALL ON public.paid_users_audit_log TO service_role;
ALTER TABLE public.paid_users_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_admin_read" ON public.paid_users_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_log_service_all" ON public.paid_users_audit_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 2. Tabela de backup diário
CREATE TABLE IF NOT EXISTS public.paid_users_backup_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  paid_user_id UUID,
  email TEXT,
  username TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_snapshot_date ON public.paid_users_backup_daily(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_backup_email ON public.paid_users_backup_daily(email);

GRANT SELECT ON public.paid_users_backup_daily TO authenticated;
GRANT ALL ON public.paid_users_backup_daily TO service_role;
ALTER TABLE public.paid_users_backup_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backup_admin_read" ON public.paid_users_backup_daily FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "backup_service_all" ON public.paid_users_backup_daily FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 3. Função de auditoria (LOG DE TUDO)
CREATE OR REPLACE FUNCTION public.paid_users_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT;
BEGIN
  BEGIN
    v_query := current_query();
  EXCEPTION WHEN OTHERS THEN
    v_query := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.paid_users_audit_log
      (operation, paid_user_id, email, username, old_data, performed_by, session_user_name, application_name, client_addr, statement_query)
    VALUES
      ('DELETE', OLD.id, OLD.email, OLD.username, to_jsonb(OLD),
       current_user, session_user,
       current_setting('application_name', true),
       COALESCE(inet_client_addr()::text, 'local'),
       LEFT(v_query, 2000));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.paid_users_audit_log
      (operation, paid_user_id, email, username, old_data, new_data, performed_by, session_user_name, application_name, client_addr, statement_query)
    VALUES
      ('UPDATE', NEW.id, NEW.email, NEW.username, to_jsonb(OLD), to_jsonb(NEW),
       current_user, session_user,
       current_setting('application_name', true),
       COALESCE(inet_client_addr()::text, 'local'),
       LEFT(v_query, 2000));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.paid_users_audit_log
      (operation, paid_user_id, email, username, new_data, performed_by, session_user_name, application_name, client_addr, statement_query)
    VALUES
      ('INSERT', NEW.id, NEW.email, NEW.username, to_jsonb(NEW),
       current_user, session_user,
       current_setting('application_name', true),
       COALESCE(inet_client_addr()::text, 'local'),
       LEFT(v_query, 2000));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_paid_users_audit ON public.paid_users;
CREATE TRIGGER trg_paid_users_audit
AFTER INSERT OR UPDATE OR DELETE ON public.paid_users
FOR EACH ROW EXECUTE FUNCTION public.paid_users_audit_trigger();

-- 4. Proteção contra exclusão em massa (STATEMENT-level)
-- Bloqueia qualquer comando DELETE que afete mais de 3 linhas de uma vez
CREATE OR REPLACE FUNCTION public.paid_users_prevent_mass_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_allow TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM deleted_rows;

  -- Escape hatch explícito: só funciona se setado na MESMA transação
  BEGIN
    v_allow := current_setting('app.allow_mass_delete', true);
  EXCEPTION WHEN OTHERS THEN
    v_allow := NULL;
  END;

  IF v_count > 3 AND COALESCE(v_allow, '') <> 'true' THEN
    -- Log a tentativa antes de bloquear
    INSERT INTO public.paid_users_audit_log
      (operation, performed_by, session_user_name, application_name, client_addr, statement_query, rows_affected_in_stmt)
    VALUES
      ('BLOCKED_MASS_DELETE', current_user, session_user,
       current_setting('application_name', true),
       COALESCE(inet_client_addr()::text, 'local'),
       LEFT(current_query(), 2000), v_count);

    RAISE EXCEPTION 'BLOQUEADO: tentativa de excluir % usuários de uma vez. Exclusões em massa não são permitidas. Delete manualmente 1 por 1 ou defina app.allow_mass_delete=true na transação.', v_count;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_paid_users_prevent_mass_delete ON public.paid_users;
CREATE TRIGGER trg_paid_users_prevent_mass_delete
AFTER DELETE ON public.paid_users
REFERENCING OLD TABLE AS deleted_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.paid_users_prevent_mass_delete();

-- 5. Função de snapshot diário
CREATE OR REPLACE FUNCTION public.paid_users_daily_backup()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Só cria um snapshot por dia
  IF EXISTS (SELECT 1 FROM public.paid_users_backup_daily WHERE snapshot_date = CURRENT_DATE) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.paid_users_backup_daily (snapshot_date, paid_user_id, email, username, data)
  SELECT CURRENT_DATE, id, email, username, to_jsonb(pu.*)
  FROM public.paid_users pu;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Retenção: manter últimos 30 dias
  DELETE FROM public.paid_users_backup_daily
  WHERE snapshot_date < CURRENT_DATE - INTERVAL '30 days';

  RETURN v_count;
END;
$$;

-- 6. Função de restauração de emergência a partir do último backup
CREATE OR REPLACE FUNCTION public.restore_paid_users_from_backup(p_snapshot_date DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  v_date := COALESCE(p_snapshot_date, (SELECT MAX(snapshot_date) FROM public.paid_users_backup_daily));
  IF v_date IS NULL THEN
    RAISE EXCEPTION 'Nenhum backup disponível';
  END IF;

  FOR r IN SELECT data FROM public.paid_users_backup_daily WHERE snapshot_date = v_date LOOP
    INSERT INTO public.paid_users (id, email, username, password, subscription_status, subscription_end, created_at, updated_at)
    VALUES (
      (r.data->>'id')::uuid,
      r.data->>'email',
      r.data->>'username',
      r.data->>'password',
      COALESCE(r.data->>'subscription_status', 'active'),
      NULLIF(r.data->>'subscription_end','')::timestamptz,
      COALESCE(NULLIF(r.data->>'created_at','')::timestamptz, now()),
      now()
    )
    ON CONFLICT (email) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 7. Cria snapshot inicial agora
SELECT public.paid_users_daily_backup();

-- 8. Agenda backup diário via pg_cron (03:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('paid_users_daily_backup');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('paid_users_daily_backup', '0 3 * * *', $cron$SELECT public.paid_users_daily_backup();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
