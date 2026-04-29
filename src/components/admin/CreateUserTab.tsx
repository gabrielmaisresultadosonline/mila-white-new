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
  Plus
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
  whatsappGroupLink: string;
  messageTemplateInstagram: string;
  messageTemplateWhatsapp: string;
}

const ACCESS_DAYS = {
  monthly: 30,
  annual: 365,
  lifetime: 999999,
};

const DEFAULT_SETTINGS: AdminSettings = {
  memberAreaLink: 'https://codigoinstashop.com.br/instagram',
  whatsappGroupLink: 'https://chat.whatsapp.com/JdEHa4jeLSUKTQFCNp7YXi',
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
  messageTemplateWhatsapp: '',
};

export const CreateUserTab = () => {
  const [loading, setLoading] = useState(false);
  const [lastCreatedAccess, setLastCreatedAccess] = useState<any>(null);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

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
  }, []);

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
      .replace(/{GROUP_LINK}/g, settings.whatsappGroupLink)
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
    } catch (error: any) {
      toast.error('Erro ao criar acesso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
  );
};
