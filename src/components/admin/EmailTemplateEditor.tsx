import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, Save, RotateCcw, Eye, Code } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplateEditorProps {
  storageKey: string;
  defaultSubject: string;
  defaultBody: string;
  /** Variables available, e.g. { name: "Cliente", username: "user1" } */
  sampleVariables: Record<string, string>;
  /** Color theme accent */
  accent?: "red" | "blue";
}

export interface SavedTemplate {
  subject: string;
  body: string;
}

/** Read saved template (or defaults) — for use by sender code */
export const getSavedTemplate = (
  storageKey: string,
  defaultSubject: string,
  defaultBody: string
): SavedTemplate => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { subject: defaultSubject, body: defaultBody };
    const parsed = JSON.parse(raw);
    return {
      subject: parsed.subject || defaultSubject,
      body: parsed.body || defaultBody,
    };
  } catch {
    return { subject: defaultSubject, body: defaultBody };
  }
};

/** Replace {{var}} placeholders */
export const renderTemplate = (
  template: string,
  vars: Record<string, string>
): string => {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
};

const EmailTemplateEditor = ({
  storageKey,
  defaultSubject,
  defaultBody,
  sampleVariables,
  accent = "blue",
}: EmailTemplateEditorProps) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = getSavedTemplate(storageKey, defaultSubject, defaultBody);
    setSubject(saved.subject);
    setBody(saved.body);
  }, [storageKey, defaultSubject, defaultBody]);

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify({ subject, body }));
    toast.success("Template salvo!");
  };

  const reset = () => {
    setSubject(defaultSubject);
    setBody(defaultBody);
    localStorage.removeItem(storageKey);
    toast.info("Template restaurado para o padrão");
  };

  const previewBody = renderTemplate(body, sampleVariables);
  const previewSubject = renderTemplate(subject, sampleVariables);

  const accentClasses =
    accent === "red"
      ? "border-red-500/30 bg-red-500/5 text-red-400"
      : "border-blue-500/30 bg-blue-500/5 text-blue-400";

  return (
    <div className={`rounded-lg border ${accentClasses} p-4 mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-medium">
          <Mail className="w-4 h-4" />
          Editar Email Enviado
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(!open)}
          className="border-zinc-600 text-zinc-300"
        >
          {open ? "Fechar Editor" : "Abrir Editor"}
        </Button>
      </div>

      {open && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Assunto</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-zinc-900 border-zinc-600 text-white"
            />
          </div>

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-700">
              <TabsTrigger value="edit" className="data-[state=active]:bg-zinc-700">
                <Code className="w-3 h-3 mr-1" /> HTML
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-zinc-700">
                <Eye className="w-3 h-3 mr-1" /> Visualizar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="edit">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="bg-zinc-900 border-zinc-600 text-white font-mono text-xs"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Variáveis disponíveis:{" "}
                {Object.keys(sampleVariables)
                  .map((k) => `{{${k}}}`)
                  .join(", ")}
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <div className="bg-white rounded p-3 max-h-[400px] overflow-y-auto">
                <p className="text-xs text-zinc-500 border-b pb-2 mb-2">
                  <strong>Assunto:</strong> {previewSubject}
                </p>
                <div dangerouslySetInnerHTML={{ __html: previewBody }} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              className="border-zinc-600 text-zinc-300"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Restaurar Padrão
            </Button>
            <Button
              size="sm"
              onClick={save}
              className={
                accent === "red"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              <Save className="w-3 h-3 mr-1" /> Salvar Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateEditor;
