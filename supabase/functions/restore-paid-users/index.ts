// One-shot: reconstrói paid_users a partir de mro_orders + user_sessions
// e reprovisiona na API SquareCloud (idempotente).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSTAGRAM_API_URL = "https://codigoinstashopapimro.squareweb.app";

function stripAffiliatePrefix(email: string): string {
  // "walberguimaraes:lu_c_oliver@hotmail.com" -> "lu_c_oliver@hotmail.com"
  const idx = email.indexOf(":");
  if (idx > 0 && !email.substring(0, idx).includes("@")) {
    return email.substring(idx + 1);
  }
  return email;
}

async function checkUserExists(username: string): Promise<boolean> {
  try {
    const r = await fetch(`${INSTAGRAM_API_URL}/api/users/${username}`);
    if (!r.ok) return false;
    const d = await r.json().catch(() => null);
    return !!(d && (d.username || d.usuario || d.success));
  } catch { return false; }
}

async function ensureInstagramUser(username: string, password: string, days: number) {
  try {
    if (await checkUserExists(username)) return { ok: true, existed: true };
    await fetch(`${INSTAGRAM_API_URL}/habilitar-usuario/${username}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: username, senha: password }),
    }).catch(() => null);
    const r = await fetch(`${INSTAGRAM_API_URL}/adicionar-usuario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, time: days, igUsers: "" }),
    });
    const data = await r.json().catch(() => ({}));
    const okMsg = r.ok || data?.success === true || String(data?.message || "").includes("já existe");
    return { ok: okMsg, existed: String(data?.message || "").includes("já existe"), raw: data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const report: any[] = [];

  // 1. Coleta candidatos de mro_orders pagos (api_created=true)
  const { data: orders } = await supabase
    .from("mro_orders")
    .select("email, username, amount, paid_at, plan_type")
    .eq("api_created", true)
    .eq("status", "completed");

  // 2. Coleta candidatos de user_sessions com email
  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("squarecloud_username, email, days_remaining, created_at")
    .not("email", "is", null);

  // Merge por username (dedup)
  const map = new Map<string, { email: string; username: string; days: number; source: string }>();

  for (const o of orders || []) {
    const email = stripAffiliatePrefix(o.email);
    const days = Number(o.amount) <= 50 ? 30 : 365;
    map.set(o.username.toLowerCase(), {
      email: email.toLowerCase().trim(),
      username: o.username,
      days,
      source: "mro_orders",
    });
  }

  for (const s of sessions || []) {
    if (!s.email) continue;
    const key = s.squarecloud_username.toLowerCase();
    if (map.has(key)) continue;
    map.set(key, {
      email: s.email.toLowerCase().trim(),
      username: s.squarecloud_username,
      days: s.days_remaining || 365,
      source: "user_sessions",
    });
  }

  // 2b. Coleta candidatos de created_accesses (usuários criados manualmente no /admin)
  const { data: manual } = await supabase
    .from("created_accesses")
    .select("customer_email, username, password, access_type, expiration_date")
    .eq("service_type", "instagram");

  for (const m of manual || []) {
    if (!m.customer_email || !m.username) continue;
    const key = m.username.toLowerCase();
    let days = 365;
    if (m.access_type === "monthly") days = 30;
    else if (m.access_type === "lifetime") days = 999999;
    else if (m.expiration_date) {
      const diff = Math.ceil((new Date(m.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff > 0) days = diff;
    }
    // Manual entries override — usam a senha correta
    map.set(key, {
      email: m.customer_email.toLowerCase().trim(),
      username: m.username,
      days,
      source: "created_accesses",
      password: m.password,
    } as any);
  }


  // 3. Para cada, upsert em paid_users + garantir na SquareCloud API
  for (const entry of map.values()) {
    const item: any = { ...entry };
    try {
      // Upsert paid_users (email é unique)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + entry.days);

      const { error: upsertErr } = await supabase
        .from("paid_users")
        .upsert({
          email: entry.email,
          username: entry.username,
          password: entry.username, // padrão do sistema: senha = username
          subscription_status: "active",
          subscription_end: endDate.toISOString(),
        }, { onConflict: "email" });

      item.db = upsertErr ? `ERR: ${upsertErr.message}` : "ok";

      // Garantir na API SquareCloud (idempotente)
      const api = await ensureInstagramUser(entry.username, entry.username, entry.days);
      item.squarecloud = api;
    } catch (e) {
      item.error = String(e);
    }
    report.push(item);
  }

  const summary = {
    total: report.length,
    db_ok: report.filter(r => r.db === "ok").length,
    squarecloud_ok: report.filter(r => r.squarecloud?.ok).length,
    squarecloud_existed: report.filter(r => r.squarecloud?.existed).length,
  };

  return new Response(JSON.stringify({ summary, report }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
