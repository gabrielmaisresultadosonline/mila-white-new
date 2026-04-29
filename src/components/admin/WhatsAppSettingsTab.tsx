import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, RefreshCw, MessageCircle, Upload, Plus, Trash2, ArrowUp, ArrowDown, Type, Phone, Image as ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface OptionItem {
  id: string;
  label: string;
  message: string;
  icon_type: string;
  color: string;
  order_index: number;
  is_active: boolean;
}

const WhatsAppSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    whatsapp_number: "",
    page_title: "",
    page_subtitle: "",
    profile_photo_url: "",
    is_direct_button: false,
    options_title: "Sobre o que deseja falar?",
    button_text: "FALAR NO WHATSAPP",
    whatsapp_message: "Olá, gostaria de saber mais sobre o Código InstaShop",
  });
  const [options, setOptions] = useState<OptionItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const [settingsRes, optionsRes] = await Promise.all([
        supabase.from("whatsapp_page_settings").select("*").limit(1).single(),
        supabase.from("whatsapp_page_options").select("*").order("order_index"),
      ]);

      if (settingsRes.data) {
        setSettings({
          id: settingsRes.data.id,
          whatsapp_number: settingsRes.data.whatsapp_number || "",
          page_title: settingsRes.data.page_title || "",
          page_subtitle: settingsRes.data.page_subtitle || "",
          profile_photo_url: settingsRes.data.profile_photo_url || "",
          is_direct_button: settingsRes.data.is_direct_button || false,
          options_title: settingsRes.data.options_title || "Sobre o que deseja falar?",
          button_text: settingsRes.data.button_text || "FALAR NO WHATSAPP",
          whatsapp_message: settingsRes.data.whatsapp_message || "Olá, gostaria de saber mais sobre o Código InstaShop",
        });
      }
      if (optionsRes.data) {
        setOptions(optionsRes.data as OptionItem[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-assets")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro ao subir imagem");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("whatsapp-assets")
      .getPublicUrl(filePath);

    setSettings({ ...settings, profile_photo_url: publicUrl });
    toast.success("Foto atualizada!");
    setUploading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_page_settings")
      .update({
        whatsapp_number: settings.whatsapp_number,
        page_title: settings.page_title,
        page_subtitle: settings.page_subtitle,
        profile_photo_url: settings.profile_photo_url,
        is_direct_button: settings.is_direct_button,
        options_title: settings.options_title,
        button_text: settings.button_text,
        whatsapp_message: settings.whatsapp_message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) toast.error("Erro ao salvar configurações");
    else toast.success("Configurações salvas!");
    setSaving(false);
  };

  const handleAddOption = async () => {
    const newOption = {
      label: "Nova Pergunta",
      message: "Olá, gostaria de falar sobre...",
      icon_type: "sparkles",
      color: "#25D366",
      order_index: options.length,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("whatsapp_page_options")
      .insert(newOption)
      .select()
      .single();

    if (error) toast.error("Erro ao adicionar pergunta");
    else {
      setOptions([...options, data as OptionItem]);
      toast.success("Pergunta adicionada!");
    }
  };

  const handleUpdateOption = async (id: string, updates: Partial<OptionItem>) => {
    const { error } = await supabase
      .from("whatsapp_page_options")
      .update(updates)
      .eq("id", id);

    if (error) toast.error("Erro ao atualizar");
    else {
      setOptions(options.map(o => o.id === id ? { ...o, ...updates } : o));
    }
  };

  const handleDeleteOption = async (id: string) => {
    const { error } = await supabase
      .from("whatsapp_page_options")
      .delete()
      .eq("id", id);

    if (error) toast.error("Erro ao remover");
    else {
      setOptions(options.filter(o => o.id !== id));
      toast.success("Pergunta removida");
    }
  };

  const moveOption = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= options.length) return;

    const newOptions = [...options];
    const temp = newOptions[index];
    newOptions[index] = newOptions[newIndex];
    newOptions[newIndex] = temp;

    // Update locally
    setOptions(newOptions.map((o, i) => ({ ...o, order_index: i })));

    // Update DB
    await Promise.all([
      supabase.from("whatsapp_page_options").update({ order_index: index }).eq("id", newOptions[index].id),
      supabase.from("whatsapp_page_options").update({ order_index: newIndex }).eq("id", newOptions[newIndex].id)
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          Configurações do WhatsApp
        </h2>
        <Button onClick={handleSaveSettings} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Todas as Configurações"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Settings */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" />
              Conteúdo da Página
            </h3>

            <div className="space-y-4">
              <div>
                <Label>Foto de Perfil</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 overflow-hidden bg-secondary">
                    {settings.profile_photo_url ? (
                      <img src={settings.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="profile-upload"
                    />
                    <Label
                      htmlFor="profile-upload"
                      className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full text-sm font-medium"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Subindo..." : "Trocar Foto"}
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Número do WhatsApp</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={settings.whatsapp_number}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      placeholder="5511999999999"
                      className="bg-secondary/50 pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Título Principal</Label>
                <Input
                  value={settings.page_title}
                  onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
                  placeholder="Ex: Gabriel está online"
                  className="bg-secondary/50 mt-1"
                />
              </div>

              <div>
                <Label>Subtítulo</Label>
                <Input
                  value={settings.page_subtitle}
                  onChange={(e) => setSettings({ ...settings, page_subtitle: e.target.value })}
                  placeholder="Ex: Clique no botão abaixo para falar"
                  className="bg-secondary/50 mt-1"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Configuração do Botão
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-white/5">
                <div className="space-y-0.5">
                  <Label>Botão Direcionado</Label>
                  <p className="text-xs text-muted-foreground">Pula as perguntas e vai direto para o Whats</p>
                </div>
                <Switch
                  checked={settings.is_direct_button}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_direct_button: checked })}
                />
              </div>

              <div>
                <Label>Texto do Botão Principal</Label>
                <Input
                  value={settings.button_text}
                  onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                  className="bg-secondary/50 mt-1"
                />
              </div>

              {settings.is_direct_button && (
                <div>
                  <Label>Mensagem Padrão (Botão Direto)</Label>
                  <Input
                    value={settings.whatsapp_message}
                    onChange={(e) => setSettings({ ...settings, whatsapp_message: e.target.value })}
                    className="bg-secondary/50 mt-1"
                    placeholder="Olá, vim pelo site..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Options Management */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Opções de Perguntas
              </h3>
              <Button size="sm" onClick={handleAddOption} variant="outline" className="h-8 border-primary/20 hover:bg-primary/10">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova Opção
              </Button>
            </div>

            {!settings.is_direct_button && (
              <div>
                <Label>Título do Menu de Opções</Label>
                <Input
                  value={settings.options_title}
                  onChange={(e) => setSettings({ ...settings, options_title: e.target.value })}
                  className="bg-secondary/50 mt-1"
                />
              </div>
            )}

            {settings.is_direct_button ? (
              <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  As perguntas estão desativadas porque o "Botão Direcionado" está ativo.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {options.map((option, index) => (
                  <div key={option.id} className="p-4 rounded-xl bg-secondary/40 border border-white/5 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary/50">#{index + 1}</span>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveOption(index, 'up')} disabled={index === 0}>
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveOption(index, 'down')} disabled={index === options.length - 1}>
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteOption(option.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px] uppercase font-bold tracking-wider opacity-50">Texto da Opção</Label>
                        <Input
                          value={option.label}
                          onChange={(e) => handleUpdateOption(option.id, { label: e.target.value })}
                          className="bg-black/20 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase font-bold tracking-wider opacity-50">Mensagem do WhatsApp</Label>
                        <Input
                          value={option.message}
                          onChange={(e) => handleUpdateOption(option.id, { message: e.target.value })}
                          className="bg-black/20 h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {options.length === 0 && (
                  <div className="text-center py-10 opacity-50">
                    <p className="text-sm italic">Nenhuma pergunta cadastrada.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettingsTab;