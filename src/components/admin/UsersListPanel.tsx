import { useEffect, useState } from 'react';
import { RefreshCw, User, Mail, Instagram, Search, CheckCircle, Trash2, Key, ShieldCheck, Zap } from 'lucide-react';
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
      const { data, error } = await supabase.functions.invoke('square-admin-proxy/remove-user', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { userId }
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
      const { data, error } = await supabase.functions.invoke('square-admin-proxy/remove-instagram', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { userId, instagram }
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
      const { data, error } = await supabase.functions.invoke('square-admin-proxy/clear-instagrams', {
        method: 'POST',
        headers: {
          'x-admin-pass': ADMIN_PASS,
          'x-admin-name': ADMIN_NAME
        },
        body: { userId }
      });

      if (error) throw error;

      toast({ title: 'Lista limpa', description: `Todos os Instagrams de ${userId} foram removidos` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = squareUsers.filter(u => {
    const userId = u?.id || (u as any)?.userId || '';
    const instagrams = u?.igInstagram || (u as any)?.instagrams || [];
    
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
                    const userId = user.id || (user as any).userId;
                    const instagrams = user.igInstagram || (user as any).instagrams || [];
                    
                    return (
                      <div key={userId} className="bg-gray-900/40 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-bold text-lg">{userId}</h3>
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 font-mono flex items-center gap-1.5">
                                <Key className="w-3 h-3" />
                                Senha: {user.password || (user as any).senha || '******'}
                              </Badge>
                              {user.acessFull || (user as any).fullAccess ? (
                                <Badge className="bg-amber-500 text-black font-bold text-[10px] h-5">FULL ACCESS</Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-400 border-gray-600 text-[10px] h-5">NORMAL</Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-500" />
                                Testes Restantes: <strong className="text-white">{user.testsRemaining ?? (user as any).testesRestantes ?? 0}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 text-blue-400" />
                                Testes Ativos: <strong className="text-white">{user.activeTests ?? (user as any).testesAtivos ?? 0}</strong>
                              </span>
                              {(user.dataDeExpiracao || (user as any).expiracao) && (
                                <span className="text-blue-300">Expira: {user.dataDeExpiracao || (user as any).expiracao}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white h-8"
                              onClick={() => handleRemoveUser(userId)}
                              disabled={isDeleting === userId}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              {isDeleting === userId ? 'Apagando...' : 'Apagar Perfil'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8"
                              onClick={() => handleClearInstagrams(userId)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              Limpar IGs
                            </Button>
                          </div>
                        </div>

                        {/* Instagrams List */}
                        <div className="mt-4 pt-4 border-t border-gray-800/50">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1.5">
                            <Instagram className="w-3 h-3" />
                            Contas Conectadas ({instagrams.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {instagrams.length > 0 ? (
                              instagrams.map((ig: string) => (
                                <div key={ig} className="bg-gray-800/80 border border-gray-700 rounded-full px-3 py-1 flex items-center gap-2 group transition-all hover:border-pink-500/50">
                                  <span className="text-xs text-gray-300 font-medium">@{ig}</span>
                                  <button 
                                    onClick={() => handleRemoveInstagram(userId, ig)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                    title="Remover apenas esta conta"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-gray-600 italic">Nenhum Instagram vinculado</span>
                            )}
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
