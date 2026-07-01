import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  RefreshCw, 
  Copy,
  Plus,
  History,
  Search,
  Mail,
  CloudUpload
} from 'lucide-react';



interface CreatedAccess {
  id: string;
  customer_email: string;
  customer_name: string | null;
  username: string;
  password: string;
  service_type: 'instagram';
  access_type: 'annual' | 'lifetime' | 'monthly';
  days_access: number;
  api_created: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  notes: string | null;
  created_at: string;
  expiration_date: string | null;
}

interface AdminSettings {
  memberAreaLink: string;
  messageTemplateInstagram: string;
}

const ACCESS_DAYS = {
  monthly: 30,
  annual: 365,
  lifetime: 999999,
};

const DEFAULT_SETTINGS: AdminSettings = {
  memberAreaLink: 'https://codigoinstashop.com.br/instagram',
  messageTemplateInstagram: `Obrigado por fazer parte do nosso sistema!✅

🚀🔥 *Ferramenta para Instagram Vip acesso!*

Preciso que assista os vídeos da área de membros com o link abaixo:

https://codigoinstashop.com.br/instagram

1 - Acesse Área Membros

2 - Acesse ferramenta para instagram

Para acessar a ferramenta e área de membros, utilize os acessos:

*usuário:* {USERNAME}

*senha:* {PASSWORD}

⚠ Assista todos os vídeos, por favor!

Atenciosamente,
*Codigo InstaShop*`,
};

export const CreateUserTab = () => {
  const [loading, setLoading] = useState(false);
  const [lastCreatedAccess, setLastCreatedAccess] = useState<any>(null);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<CreatedAccess[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    customerEmail: '',
    username: '',
    password: '',
    serviceType: 'instagram' as 'instagram',
    accessType: 'annual' as 'annual' | 'lifetime' | 'monthly',
    notes: '',
    createInApi: true,
  });

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'list_accesses' },
      });
      if (!error && data?.accesses) {
        setHistory(data.accesses);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };


  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'get_settings' },
      });
      if (!error && data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password });
  };

  const generateCopyMessage = (access: any) => {
    const template = settings.messageTemplateInstagram;
    
    return template
      .replace(/{MEMBER_LINK}/g, settings.memberAreaLink)
      .replace(/{USERNAME}/g, access.username)
      .replace(/{PASSWORD}/g, access.password);
  };

  const copyToClipboard = async (access: any) => {
    const message = generateCopyMessage(access);
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Acesso copiado!');
    } catch (e) {
      toast.error('Erro ao copiar');
    }
  };

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [reprovisioning, setReprovisioning] = useState(false);

  const resendEmail = async (access: CreatedAccess) => {
    try {
      setResendingId(access.id);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'resend_email', id: access.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Email reenviado para ${access.customer_email}`);
        loadHistory();
      } else {
        toast.error('Falha ao reenviar email');
      }
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setResendingId(null);
    }
  };

  const reprovisionAllOnSquareCloud = async () => {
    if (!confirm('Recriar TODOS os usuários (manuais + compras) na SquareCloud? Emails NÃO serão reenviados.')) return;
    try {
      setReprovisioning(true);
      toast.info('Iniciando reprovisionamento na SquareCloud...');
      const { data, error } = await supabase.functions.invoke('restore-paid-users', { body: {} });
      if (error) throw error;
      toast.success(`Reprovisionamento concluído: ${data?.restored ?? 0} usuários`);
    } catch (e: any) {
      toast.error('Erro no reprovisionamento: ' + e.message);
    } finally {
      setReprovisioning(false);
    }
  };


  const handleCreateAccess = async () => {
    if (!form.customerEmail || !form.username || !form.password) {
      toast.error('Preencha email, usuário e senha!');
      return;
    }

    try {
      setLoading(true);
      const daysAccess = ACCESS_DAYS[form.accessType];
      
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'create_access',
          customerEmail: form.customerEmail,
          customerName: '',
          username: form.username,
          password: form.password,
          serviceType: form.serviceType,
          accessType: form.accessType,
          daysAccess,
          notes: form.notes || null,
          createInApi: form.createInApi,
        },
      });

      if (error) throw error;

      toast.success(
        `Acesso criado! API: ${data.apiCreated ? '✅' : '❌'} | Email: ${data.emailSent ? '✅' : '❌'}`
      );

      setLastCreatedAccess(data.accessRecord);

      setForm({
        customerEmail: '',
        username: '',
        password: '',
        serviceType: 'instagram',
        accessType: 'annual',
        notes: '',
        createInApi: true,
      });
      loadHistory();
    } catch (error: any) {
      toast.error('Erro ao criar acesso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      h.username?.toLowerCase().includes(q) ||
      h.customer_email?.toLowerCase().includes(q) ||
      h.customer_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      <div className="lg:col-span-2 space-y-6">

      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Criar Novo Usuário Manual
          </CardTitle>
          <CardDescription>
            Crie acessos para novos clientes e gere as credenciais automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email do Cliente</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="exemplo@email.com"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                className="bg-secondary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">Ferramenta</Label>
              <Select
                value={form.serviceType}
                onValueChange={(v: any) => setForm({ ...form, serviceType: v })}
                disabled
              >
                <SelectTrigger className="bg-secondary/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram VIP (InstaShop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário (Username)</Label>
              <Input
                id="username"
                placeholder="username123"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="bg-secondary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  placeholder="********"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-secondary/30"
                />
                <Button variant="outline" size="icon" onClick={generatePassword} className="shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accessType">Tipo de Plano</Label>
              <Select
                value={form.accessType}
                onValueChange={(v: any) => setForm({ ...form, accessType: v })}
              >
                <SelectTrigger className="bg-secondary/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                  <SelectItem value="annual">Anual (365 dias)</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <input
                type="checkbox"
                id="createInApi"
                checked={form.createInApi}
                onChange={(e) => setForm({ ...form, createInApi: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="createInApi" className="cursor-pointer">Criar no Banco de Dados (API)</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Alguma observação sobre este cliente..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-secondary/30 min-h-[80px]"
            />
          </div>

          <Button 
            onClick={handleCreateAccess} 
            disabled={loading} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Plus className="w-5 h-5 mr-2" />
            )}
            CRIAR ACESSO AGORA
          </Button>

          {lastCreatedAccess && (
            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary">Acesso criado com sucesso!</span>
                <Button size="sm" onClick={() => copyToClipboard(lastCreatedAccess)} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copiar Dados para o Cliente
                </Button>
              </div>
              <div className="text-xs space-y-1">
                <p><strong>Usuário:</strong> {lastCreatedAccess.username}</p>
                <p><strong>Senha:</strong> {lastCreatedAccess.password}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="glass-card border-primary/20 lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Histórico ({filteredHistory.length})
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={reprovisionAllOnSquareCloud}
                  disabled={reprovisioning}
                  className="h-7 w-7"
                  title="Recriar TODOS na SquareCloud (manuais + compras)"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${reprovisioning ? 'animate-pulse text-primary' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={loadHistory} disabled={loadingHistory} className="h-7 w-7">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                </Button>
              </div>

            </CardTitle>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário/email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-secondary/30 h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {loadingHistory && history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário criado ainda</p>
              ) : (
                filteredHistory.map((h) => (
                  <div key={h.id} className="p-2.5 rounded-md bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-primary truncate">{h.username}</span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => resendEmail(h)}
                          disabled={resendingId === h.id}
                          title="Reenviar email de acesso"
                        >
                          {resendingId === h.id
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Mail className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(h)}
                          title="Copiar mensagem para cliente"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-muted-foreground truncate">{h.customer_email}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{h.access_type === 'lifetime' ? 'Vitalício' : h.access_type === 'annual' ? 'Anual' : 'Mensal'}</span>
                      <span>{new Date(h.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex gap-1 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${h.api_created ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        API {h.api_created ? '✓' : '✗'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${h.email_sent ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        Email {h.email_sent ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

