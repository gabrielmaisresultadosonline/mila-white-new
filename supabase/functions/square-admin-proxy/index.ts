import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-pass, x-admin-name',
};

const API_BASE = "https://codigoinstashopapimro.squareweb.app";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Configured Credentials
    const ADMIN_PASS = "Ga145523@";
    const ADMIN_NAME = "MRO";

    // Capture body input for POST requests
    const bodyInput = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    
    // Action can be in URL param or in body
    const action = url.searchParams.get("action") || bodyInput.action || "";
    
    console.log(`[square-admin-proxy] Identified action: ${action}`);

    const routes: Record<string, { method: string; path: string; buildBody?: (p: any) => any }> = {
      "list-users": { 
        method: "GET", 
        path: "/admin/usuarios" 
      },
      "blacklist": {
        method: "POST",
        path: "/blacklist",
        buildBody: (p) => ({ 
          userId: p.userId, 
          blackListStatus: p.blackListStatus !== undefined ? p.blackListStatus : true 
        }),
      },
      "clear-instagrams": {
        method: "POST",
        path: "/limpar-perfil",
        buildBody: (p) => ({ 
          userId: p.userId 
        }),
      },
      "remove-instagram": {
        method: "POST",
        path: "/admin/remover-instagram",
        buildBody: (p) => ({ 
          userId: p.userId, 
          instagram: p.instagram 
        }),
      },
      "remove-user": {
        method: "POST",
        path: "/admin/remover-usuario",
        buildBody: (p) => ({ 
          userId: p.userId 
        }),
      },
      "zerar-testes": {
        method: "POST",
        path: "/zerar-testes",
        buildBody: (p) => ({ 
          userId: p.userId 
        }),
      },
      "add-ig-extra": {
        method: "POST",
        path: "/adicionar-ig-extra",
        buildBody: (p) => ({ 
          username: p.username || p.userId, 
          quantidade: Number(p.quantidade) 
        }),
      },
    };

    // Default to list-users if no specific action provided but it's a GET request
    const effectiveAction = action || "list-users";
    const route = routes[effectiveAction];
    
    if (!route) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Ação inválida ou não fornecida: ${effectiveAction}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = `${API_BASE}${route.path}`;
    console.log(`[square-admin-proxy] Proxying ${route.method} to ${targetUrl}`);

    const headers: Record<string, string> = {
      "x-admin-pass": ADMIN_PASS,
      "x-admin-name": ADMIN_NAME,
    };

    let body: string | undefined;

    if (route.method !== "GET") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(route.buildBody ? route.buildBody(bodyInput) : bodyInput);
      console.log(`[square-admin-proxy] Sending body: ${body}`);
    }

    const apiResp = await fetch(targetUrl, {
      method: route.method,
      headers,
      body,
    });

    const text = await apiResp.text();
    console.log(`[square-admin-proxy] SquareCloud raw response (${apiResp.status}):`, text.substring(0, 500));

    let parsed: any;
    try { 
      parsed = JSON.parse(text); 
    } catch { 
      parsed = { raw: text }; 
    }

    if (!apiResp.ok) {
      return new Response(JSON.stringify({
        success: false,
        message: `Erro na API SquareCloud (${apiResp.status}). Verifique se a API na SquareCloud possui a rota ${route.path} e foi redeployada recentemente.`,
        endpoint: targetUrl,
        status: apiResp.status,
        debug: text,
      }), {
        status: apiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error('[square-admin-proxy] Error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Erro interno no proxy", 
      error: String(e) 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});