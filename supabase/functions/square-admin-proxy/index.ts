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
    const contentType = req.headers.get('content-type') || '';
    let bodyJson: any = {};
    
    // Log the incoming request for debugging
    console.log(`[square-admin-proxy] Incoming ${req.method} request to ${url.pathname}`);
    console.log(`[square-admin-proxy] Content-Type: ${contentType}`);

    if (req.method === 'POST') {
      try {
        const text = await req.text();
        console.log(`[square-admin-proxy] Raw body: ${text.substring(0, 100)}`);
        if (text) {
          bodyJson = JSON.parse(text);
        }
      } catch (e) {
        console.error('[square-admin-proxy] Error parsing request body:', e);
      }
    }

    // Determine action from URL path, query param, or body
    const pathAction = url.pathname.split('/').pop();
    const action = (pathAction && pathAction !== 'square-admin-proxy' ? pathAction : null) || 
                   url.searchParams.get('action') || 
                   bodyJson.action;
    
    console.log(`[square-admin-proxy] Identified action: ${action}`);
    
    // Pass through admin headers
    const adminPass = req.headers.get('x-admin-pass');
    const adminName = req.headers.get('x-admin-name');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add all variations of admin headers to ensure compatibility
    if (adminPass) {
      headers['x-admin-pass'] = adminPass;
      headers['admin_pass'] = adminPass;
      headers['password'] = adminPass;
    }
    if (adminName) {
      headers['x-admin-name'] = adminName;
      headers['x-admin-user'] = adminName;
      headers['admin_user'] = adminName;
      headers['username'] = adminName;
    }

    let targetUrl = `${API_BASE}/usuarios`;
    let method = 'GET';
    let body = null;

    // Create a copy of bodyJson without the action field to send to SquareCloud
    const squareBody: any = { ...bodyJson };
    delete squareBody.action;
    
    // Normalize user identifier field
    const userIdentifier = squareBody.userId || squareBody.username || squareBody.usuario;
    if (userIdentifier) {
      squareBody.userId = userIdentifier;
      squareBody.username = userIdentifier;
      squareBody.usuario = userIdentifier;
    }

    // Mapping actions to their correct endpoints in SquareCloud
    if (action === 'remove-user') {
      targetUrl = `${API_BASE}/admin/remover-usuario`;
      method = 'POST';
      body = JSON.stringify(squareBody);
    } else if (action === 'remove-instagram') {
      targetUrl = `${API_BASE}/remover-instagram`;
      method = 'POST';
      body = JSON.stringify(squareBody);
    } else if (action === 'clear-instagrams') {
      targetUrl = `${API_BASE}/admin/limpar-instagrams`;
      method = 'POST';
      body = JSON.stringify(squareBody);
    } else if (action === 'blacklist') {
      targetUrl = `${API_BASE}/admin/blacklist`;
      method = 'POST';
      body = JSON.stringify(squareBody);
    } else if (action === 'zerar-testes') {
      targetUrl = `${API_BASE}/admin/zerar-testes`;
      method = 'POST';
      body = JSON.stringify(squareBody);
    } else if (action === 'add-ig-extra') {
      targetUrl = `${API_BASE}/adicionar-ig-extra`;
      method = 'POST';
      body = JSON.stringify(squareBody);
    }

    console.log(`[square-admin-proxy] Proxying ${method} to ${targetUrl}`);
    console.log(`[square-admin-proxy] Headers keys: ${Object.keys(headers).join(', ')}`);

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
