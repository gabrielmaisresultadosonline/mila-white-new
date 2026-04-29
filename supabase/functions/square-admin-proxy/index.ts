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

    let targetUrl = `${API_BASE}/admin/usuarios`;
    let method = 'GET';
    let body = null;

    if (action === 'remove-user') {
      targetUrl = `${API_BASE}/admin/remover-usuario`;
      method = 'POST';
      body = await req.text();
    } else if (action === 'remove-instagram') {
      targetUrl = `${API_BASE}/admin/remover-instagram`;
      method = 'POST';
      body = await req.text();
    } else if (action === 'clear-instagrams') {
      targetUrl = `${API_BASE}/admin/limpar-instagrams`;
      method = 'POST';
      body = await req.text();
    }

    console.log(`[square-admin-proxy] Proxying ${method} to ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: method === 'POST' ? body : null,
    });

    const data = await response.json();
    
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
