import { useEffect, useState } from 'react';
import { RefreshCw, User, Mail, Instagram, Search, CheckCircle, Trash2, Key, ShieldCheck, Zap, Ban, Plus, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface SquareUser {
  id: string;
  password?: string;
  igInstagram?: string[];
  igCount?: number;
  testsRemaining?: number;
  activeTests?: number;
  extraIgSlots?: number;
  acessFull?: boolean;
  blackList?: boolean;
  dataDeExpiracao?: string;
  // New nested structure support
  ID?: string;
  data?: {
    igInstagram?: string[];
    dataDeExpiracao?: number;
    blackList?: boolean;
    userTeste?: boolean;
    testsRemainingMonth?: number;
    numero?: string;
    extraIgSlots?: number;
  };
}

const UsersListPanel = () => {
  const { toast } = useToast();
  const [squareUsers, setSquareUsers] = useState<SquareUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const API_BASE = "https://codigoinstashopapimro.squareweb.app";
  const ADMIN_PASS = "maisresultadosonline";
  const ADMIN_NAME = "ADMIN";

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('[UsersListPanel] Fetching SquareCloud users via Proxy...');
      
      const { data, error } = await supabase.functions.invoke('square-admin-proxy', {
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        }
      });

      if (error) throw error;

      console.log('[UsersListPanel] API full response:', data);
      
      const userList = data.usuarios || data.users || (Array.isArray(data) ? data : []);

      if (Array.isArray(userList)) {
        setSquareUsers(userList);
        console.log(`[UsersListPanel] ${userList.length} users loaded from SquareCloud`);
      } else {
        console.error('[UsersListPanel] Data structure is unexpected:', data);
        throw new Error('Formato de resposta inesperado da API');
      }
    } catch (error: any) {
      console.error('[UsersListPanel] Error:', error);
      toast({ 
        title: 'Erro na API SquareCloud', 
        description: error?.message || 'Não foi possível carregar a lista de usuários ativos. Verifique se a Edge Function square-admin-proxy está implantada.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm(`Tem certeza que deseja remover permanentemente o usuário ${userId}?`)) return;

    setIsDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke('square-admin-proxy?action=remove-user', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { action: 'remove-user', userId }
      });

      if (error) throw error;

      toast({ title: 'Usuário removido', description: data.message || 'Perfil excluído com sucesso' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRemoveInstagram = async (userId: string, instagram: string) => {
    if (!confirm(`Remover conta @${instagram} do usuário ${userId}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('square-admin-proxy?action=remove-instagram', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { action: 'remove-instagram', userId, instagram }
      });

      if (error) throw error;

      toast({ title: 'Instagram removido', description: `@${instagram} removido do usuário ${userId}` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleClearInstagrams = async (userId: string) => {
    if (!confirm(`Remover TODAS as contas de Instagram do usuário ${userId}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('square-admin-proxy?action=clear-instagrams', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { action: 'clear-instagrams', userId }
      });

      if (error) throw error;

      toast({ title: 'Lista limpa', description: `Todos os Instagrams de ${userId} foram removidos` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleBlacklist = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const actionLabel = newStatus ? 'Ativar Blacklist' : 'Remover da Blacklist';
    
    if (!confirm(`${actionLabel} para o usuário ${userId}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('square-admin-proxy', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { action: 'blacklist', userId, blackListStatus: newStatus }
      });

      if (error) throw error;

      toast({ 
        title: 'Blacklist atualizada', 
        description: data.message || `Status de blacklist para ${userId} alterado para ${newStatus ? 'Ativado' : 'Desativado'}` 
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleResetTests = async (userId: string) => {
    if (!confirm(`Deseja zerar os testes do usuário ${userId}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('square-admin-proxy', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { action: 'zerar-testes', userId }
      });

      if (error) throw error;

      toast({ 
        title: 'Testes zerados', 
        description: `Os testes de ${userId} foram resetados com sucesso.` 
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddExtraSlots = async (userId: string) => {
    const qty = prompt('Quantas contas extras (IG disponíveis) deseja adicionar?', '1');
    if (qty === null) return;
    
    const quantidade = parseInt(qty, 10);
    if (isNaN(quantidade) || quantidade <= 0) {
      toast({ title: 'Valor inválido', description: 'Por favor, insira um número maior que zero.', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('square-admin-proxy', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { action: 'add-ig-extra', username: userId, quantidade }
      });

      if (error) throw error;

      toast({ 
        title: 'Slots adicionados', 
        description: `Foram adicionados +${quantidade} slots extras para o usuário ${userId}.` 
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleCopyAccess = (userId: string, password?: string) => {
    const accessText = `Obrigado por fazer parte do nosso sistema!✅

🚀🔥 Ferramenta para Instagram Vip acesso!

Preciso que assista os vídeos da área de membros com o link abaixo:

https://codigoinstashop.com.br/instagram

1 - Acesse Área Membros

2 - Acesse ferramenta para instagram

Para acessar a ferramenta e área de membros, utilize os acessos:

usuário: ${userId}

senha: ${password || '******'}

⚠ Assista todos os vídeos, por favor!`;

    navigator.clipboard.writeText(accessText).then(() => {
      toast({
        title: 'Acesso copiado!',
        description: 'Os dados de acesso foram copiados para a área de transferência.',
      });
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar os dados.',
        variant: 'destructive'
      });
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = squareUsers.filter(u => {
    const userId = u?.id || u?.ID || (u as any)?.userId || '';
    const instagrams = u?.igInstagram || u?.data?.igInstagram || (u as any)?.instagrams || [];
    
    return userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instagrams.some((ig: string) => ig.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3 border-b border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Lista Usuários e Senhas (SquareCloud)
              </CardTitle>
              <CardDescription className="text-gray-400">
                Gerenciamento direto no banco de dados da API ativa
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={fetchData} disabled={isLoading} className="border-primary/50 text-primary">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por usuário ou @instagram..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white"
              />
            </div>

            <ScrollArea className="h-[600px] pr-4">
              {isLoading && squareUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-400">Sincronizando com a API SquareCloud...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhum usuário encontrado na SquareCloud</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((user) => {
                    const userId = user.id || user.ID || (user as any).userId;
                    const instagrams = user.igInstagram || user.data?.igInstagram || (user as any).instagrams || [];
                    const isBlacklisted = user.blackList || user.data?.blackList || (user as any).blackList;
                    const expiration = user.dataDeExpiracao || user.data?.dataDeExpiracao || (user as any).expiracao;
                    const isFullAccess = user.acessFull || (expiration && Number(expiration) > 365) || (user as any).fullAccess;
                    const extraSlots = user.extraIgSlots ?? user.data?.extraIgSlots ?? 0;
                    
                    return (
                      <div key={userId} className="bg-gray-900/40 border border-gray-700/50 rounded-xl p-3 sm:p-4 hover:border-blue-500/30 transition-all">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-white font-bold text-base sm:text-lg truncate max-w-[150px] sm:max-w-none">{userId}</h3>
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 font-mono flex items-center gap-1.5 text-[10px] sm:text-xs">
                                  <Key className="w-3 h-3" />
                                  <span className="hidden xs:inline">Senha:</span> {user.password || (user as any).senha || user.data?.numero || '******'}
                                </Badge>
                                {isFullAccess ? (
                                  <Badge className="bg-amber-500 text-black font-bold text-[9px] sm:text-[10px] h-5">FULL</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-400 border-gray-600 text-[9px] sm:text-[10px] h-5">NORMAL</Badge>
                                )}
                                {isBlacklisted && (
                                  <Badge variant="destructive" className="flex items-center gap-1 text-[9px] sm:text-[10px] h-5">
                                    <Ban className="w-3 h-3" /> BLACKLIST
                                  </Badge>
                                )}
                                {extraSlots > 0 && (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[9px] sm:text-[10px] h-5">
                                    +{extraSlots} EXTRAS
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-yellow-500" />
                                  Testes: <strong className="text-white">{user.testsRemaining ?? user.data?.testsRemainingMonth ?? (user as any).testesRestantes ?? 0}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 text-blue-400" />
                                  Ativos: <strong className="text-white">{user.activeTests ?? (user as any).testesAtivos ?? 0}</strong>
                                </span>
                                {expiration && (
                                  <span className="text-blue-300">Expira: {expiration}d</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs flex-1 sm:flex-none"
                                onClick={() => handleRemoveUser(userId)}
                                disabled={isDeleting === userId}
                              >
                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                                {isDeleting === userId ? '...' : 'apagar'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs flex-1 sm:flex-none"
                                onClick={() => handleClearInstagrams(userId)}
                              >
                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                                limpar Ig total
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className={`h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs flex-1 sm:flex-none ${isBlacklisted ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'border-gray-600 text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'}`}
                                onClick={() => handleToggleBlacklist(userId, !!isBlacklisted)}
                              >
                                <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                                {isBlacklisted ? 'desativar blacklist' : 'ativar blacklist'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs flex-1 sm:flex-none"
                                onClick={() => handleResetTests(userId)}
                              >
                                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                                teste reset
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs flex-1 sm:flex-none"
                                onClick={() => handleAddExtraSlots(userId)}
                              >
                                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                                adcional de IG
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs w-full sm:w-auto mt-1 sm:mt-0"
                                onClick={() => handleCopyAccess(userId, user.password || (user as any).senha || user.data?.numero)}
                              >
                                <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                                copiar acesso
                              </Button>
                            </div>
                          </div>

                          {/* Instagrams List */}
                          <div className="pt-3 border-t border-gray-800/50">
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1.5">
                              <Instagram className="w-3 h-3" />
                              Contas ({instagrams.length}):
                            </p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {instagrams.length > 0 ? (
                                instagrams.map((ig: string) => (
                                  <div key={ig} className="bg-gray-800/80 border border-gray-700 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1.5 sm:gap-2 group transition-all hover:border-pink-500/50">
                                    <span className="text-[10px] sm:text-xs text-gray-300 font-medium">@{ig}</span>
                                    <button 
                                      onClick={() => handleRemoveInstagram(userId, ig)}
                                      className="text-gray-500 hover:text-red-400 transition-colors"
                                      title="Remover apenas esta conta"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <span className="text-[10px] sm:text-xs text-gray-600 italic">Nenhum Instagram</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersListPanel;