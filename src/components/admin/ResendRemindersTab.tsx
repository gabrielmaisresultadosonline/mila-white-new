import { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send, RefreshCw, CheckCircle2, XCircle, Clock, Users, Search, Pause, Play, Square } from 'lucide-react';

interface Recipient {
  email: string;
  name: string;
  username: string;
  password: string;
  source: 'vendas' | 'manual';
}

interface LogEntry {
  recipient_email: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const LOGIN_URL = 'https://codigoinstashop.com.br/instagram';
const DEFAULT_SUBJECT = 'Seu acesso à ferramenta Código InstaShop';
const DEFAULT_BODY = `Olá!

Estamos passando para <strong>lembrar do seu acesso</strong> à ferramenta <strong>Código InstaShop</strong>. Sua conta continua ativa e pronta para uso.

<strong>🔐 Seus dados de acesso:</strong>

🌐 <strong>Link de acesso:</strong> ${LOGIN_URL}
👤 <strong>Usuário:</strong> [USUARIO]
🔑 <strong>Senha:</strong> [SENHA]

Guarde este email em um local seguro. Caso tenha qualquer dúvida ou precise de ajuda com o acesso, nosso suporte está à disposição no WhatsApp:

[BOTAO_WHATSAPP]

Continue aproveitando ao máximo todas as ferramentas para crescer no Instagram.

Abraços,
Equipe Código InstaShop`;

export function ResendRemindersTab() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);
  const pausedRef = useRef<boolean>(false);
  const stopRef = useRef<boolean>(false);

  const [progress, setProgress] = useState({ done: 0, total: 0, current: '', ok: 0, fail: 0 });
  const [search, setSearch] = useState('');
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [minDelay, setMinDelay] = useState(2);
  const [maxDelay, setMaxDelay] = useState(6);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, manualRes, logsRes] = await Promise.all([
        supabase.from('mro_orders').select('email, username, status').eq('status', 'completed'),
        supabase.functions.invoke('manage-user-access', { body: { action: 'list_accesses' } }),
        supabase.from('broadcast_email_logs').select('recipient_email, status, sent_at, created_at').order('created_at', { ascending: false }).limit(2000),
      ]);
      const manualList: any[] = (manualRes as any)?.data?.accesses || [];

      const map = new Map<string, Recipient>();

      // Manual first (has plaintext password)
      for (const m of manualList) {
        if (!m.customer_email) continue;
        const em = String(m.customer_email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) continue;
        if (!map.has(em)) map.set(em, {
          email: em,
          name: m.customer_name || m.username || '',
          username: m.username || '',
          password: m.password || '',
          source: 'manual',
        });
      }

      for (const o of ordersRes.data || []) {
        if (!o.email) continue;
        let em = String(o.email).trim().toLowerCase();
        const colonIdx = em.indexOf(':');
        if (colonIdx > 0 && !em.substring(0, colonIdx).includes('@')) em = em.substring(colonIdx + 1);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) continue;
        if (!map.has(em)) map.set(em, {
          email: em,
          name: o.username || '',
          username: o.username || '',
          password: '',
          source: 'vendas',
        });
      }

      setRecipients(Array.from(map.values()));
      setLogs(logsRes.data || []);
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Map latest log per email for the CURRENT subject
  const sentSet = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) {
      if (l.status === 'sent') s.add(l.recipient_email.toLowerCase());
    }
    return s;
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipients.filter(r => !q || r.email.includes(q) || r.username.toLowerCase().includes(q));
  }, [recipients, search]);

  const pending = useMemo(
    () => filtered.filter(r => !skipAlreadySent || !sentSet.has(r.email)),
    [filtered, sentSet, skipAlreadySent]
  );

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  const startSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Preencha assunto e corpo do email');
      return;
    }
    if (pending.length === 0) {
      toast.info('Nenhum destinatário pendente');
      return;
    }
    if (!confirm(`Enviar lembrete para ${pending.length} usuários?\nDelay: ${minDelay}s a ${maxDelay}s entre envios.`)) return;

    setSending(true);
    stopRef.current = false;
    pausedRef.current = false;
    let ok = 0, fail = 0;
    setProgress({ done: 0, total: pending.length, current: '', ok: 0, fail: 0 });

    for (let i = 0; i < pending.length; i++) {
      if (stopRef.current) break;
      while (pausedRef.current && !stopRef.current) await wait(500);

      const r = pending[i];
      setProgress(p => ({ ...p, current: r.email, done: i }));

      try {
        const usuarioTxt = r.username || r.email;
        const senhaTxt = r.password
          ? r.password
          : 'entre em contato no WhatsApp para recuperar';
        const personalizedBody = body
          .replace(/\[USUARIO\]/g, usuarioTxt)
          .replace(/\[SENHA\]/g, senhaTxt)
          .replace(/\[EMAIL\]/g, r.email);

        const { data, error } = await supabase.functions.invoke('broadcast-email', {
          body: {
            to: r.email,
            subject: subject.trim(),
            body: personalizedBody,
            userName: r.name,
            rawHtml: false,
          },
        });
        if (error || !data?.success) throw new Error(error?.message || data?.error || 'Falha');
        ok++;
      } catch (e: any) {
        fail++;
        console.error('resend fail', r.email, e);
      }

      setProgress(p => ({ ...p, ok, fail, done: i + 1 }));

      // random delay
      if (i < pending.length - 1) {
        const ms = (minDelay + Math.random() * Math.max(0, maxDelay - minDelay)) * 1000;
        await wait(ms);
      }
    }

    setSending(false);
    toast.success(`Envio concluído: ${ok} ok, ${fail} falhas`);
    loadData();
  };

  const alreadySentCount = filtered.filter(r => sentSet.has(r.email)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Reenviar Lembretes de Acesso</h2>
          <p className="text-sm text-muted-foreground">
            Envia um email lembrando o acesso da ferramenta para todos os clientes (vendas + manuais).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading || sending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Recarregar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Total" value={recipients.length} />
        <StatCard icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Já enviados" value={alreadySentCount} />
        <StatCard icon={<Clock className="w-4 h-4 text-amber-500" />} label="Pendentes" value={pending.length} />
        <StatCard icon={<Send className="w-4 h-4 text-primary" />} label="Filtrados" value={filtered.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: composer */}
        <div className="lg:col-span-2 space-y-3 bg-card border rounded-lg p-4">
          <div>
            <Label>Assunto</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} disabled={sending} />
          </div>
          <div>
            <Label>Mensagem <span className="text-xs text-muted-foreground">(placeholders: <code>[USUARIO]</code>, <code>[SENHA]</code>, <code>[EMAIL]</code>, <code>[BOTAO_WHATSAPP]</code>)</span></Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={14} disabled={sending} className="font-mono text-sm" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={skipAlreadySent} onChange={e => setSkipAlreadySent(e.target.checked)} disabled={sending} />
              Pular quem já recebeu
            </label>
            <div className="flex items-center gap-2 text-sm">
              <span>Delay:</span>
              <Input type="number" min={0} max={30} value={minDelay} onChange={e => setMinDelay(Number(e.target.value) || 0)} className="w-16 h-8" disabled={sending} />
              <span>a</span>
              <Input type="number" min={0} max={60} value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value) || 0)} className="w-16 h-8" disabled={sending} />
              <span>s</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap pt-2 border-t">
            {!sending ? (
              <Button onClick={startSend} disabled={pending.length === 0 || loading} className="bg-primary">
                <Send className="w-4 h-4 mr-2" /> Enviar para {pending.length} pendentes
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { pausedRef.current = !pausedRef.current; }}>
                  {pausedRef.current ? <><Play className="w-4 h-4 mr-2" /> Retomar</> : <><Pause className="w-4 h-4 mr-2" /> Pausar</>}
                </Button>
                <Button variant="destructive" onClick={() => { stopRef.current = true; }}>
                  <Square className="w-4 h-4 mr-2" /> Parar
                </Button>
              </>
            )}
          </div>

          {(sending || progress.done > 0) && (
            <div className="mt-3 p-3 bg-muted rounded space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.done} / {progress.total}</span>
                <span className="text-muted-foreground">
                  ✅ {progress.ok} · ❌ {progress.fail}
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
              {progress.current && (
                <div className="text-xs text-muted-foreground truncate">Enviando para: {progress.current}</div>
              )}
            </div>
          )}
        </div>

        {/* Right: list + history */}
        <div className="space-y-3 bg-card border rounded-lg p-4 max-h-[700px] flex flex-col">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por email ou usuário..." value={search} onChange={e => setSearch(e.target.value)} className="h-8" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 text-sm">
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-6 text-xs">Nenhum destinatário.</div>
            )}
            {filtered.map(r => {
              const sent = sentSet.has(r.email);
              return (
                <div key={r.email} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.username || r.email}</div>
                    <div className="truncate text-muted-foreground">{r.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.source === 'vendas' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                      {r.source}
                    </span>
                    {sent ? (
                      <span className="text-green-500 flex items-center gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> enviado
                      </span>
                    ) : (
                      <span className="text-amber-500 text-[10px]">pendente</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
