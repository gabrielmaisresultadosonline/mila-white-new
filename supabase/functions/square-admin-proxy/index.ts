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
    const action = url.pathname.split('/').pop();
    
    // Pass through admin headers
    const adminPass = req.headers.get('x-admin-pass');
    const adminName = req.headers.get('x-admin-name');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (adminPass) headers['x-admin-pass'] = adminPass;
    if (adminName) headers['x-admin-name'] = adminName;

    let targetUrl = `${API_BASE}/usuarios`; // Removing /admin to test if the endpoint is at the root
    let method = 'GET';
    let body = null;

    if (action === 'remove-user' || url.pathname.includes('/remove-user')) {
      targetUrl = `${API_BASE}/admin/remover-usuario`;
      method = 'POST';
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    } else if (action === 'remove-instagram' || url.pathname.includes('/remove-instagram')) {
      targetUrl = `${API_BASE}/admin/remover-instagram`;
      method = 'POST';
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    } else if (action === 'clear-instagrams' || url.pathname.includes('/clear-instagrams')) {
      targetUrl = `${API_BASE}/admin/limpar-instagrams`;
      method = 'POST';
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    } else if (action === 'blacklist' || url.pathname.includes('/blacklist')) {
      targetUrl = `${API_BASE}/admin/blacklist`;
      method = 'POST';
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    } else if (action === 'zerar-testes' || url.pathname.includes('/zerar-testes')) {
      targetUrl = `${API_BASE}/admin/zerar-testes`;
      method = 'POST';
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    } else if (action === 'add-ig-extra' || url.pathname.includes('/add-ig-extra')) {
      targetUrl = `${API_BASE}/adicionar-ig-extra`;
      method = 'POST';
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    }

    console.log(`[square-admin-proxy] Proxying ${method} to ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: method === 'POST' ? body : null,
    });

    const responseText = await response.text();
    console.log(`[square-admin-proxy] SquareCloud raw response (${response.status}):`, responseText.substring(0, 500));

    // If response is HTML, it's an error from the server (like 404 or 500)
    if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        return new Response(JSON.stringify({ 
            success: false, 
            message: `Erro na API SquareCloud (${response.status}). O servidor retornou uma página de erro (404/500). Verifique se o endpoint ${targetUrl} está correto.`,
            debug: responseText.substring(0, 200)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        return new Response(JSON.stringify({ 
            success: false, 
            message: "A API retornou um formato inválido (não é JSON).",
            debug: responseText.substring(0, 100)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });

  } catch (error) {
    console.error('[square-admin-proxy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
