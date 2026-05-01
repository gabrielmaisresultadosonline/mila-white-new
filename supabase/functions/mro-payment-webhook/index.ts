import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { verifyInfinitePayWebhook } from "../_shared/webhook-security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSTAGRAM_API_URL = "https://codigoinstashopapimro.squareweb.app";

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [INSTASHOP-PAYMENT-WEBHOOK] ${step}${detailsStr}`);
};

// HTML do Email de Acesso
function getEmailHtml(username: string, password: string, planType: string): string {
  const memberAreaUrl = "https://codigoinstashop.com.br";
  const supportWhatsappUrl = "https://codigoinstashop.com.br/whatsapp";
  const planLabel = planType === "lifetime" ? "Vitalício" : planType === "trial" ? "Teste 30 Dias" : "Anual";
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.6;color:#333;background-color:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr>
<td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:30px;text-align:center;">
<div style="background:#000;color:#fff;display:inline-block;padding:12px 28px;border-radius:8px;font-size:22px;font-weight:bold;letter-spacing:1px;margin-bottom:10px;">Código InstaShop</div>
<h1 style="color:#000;margin:15px 0 0 0;font-size:24px;">🎉 Acesso Liberado!</h1>
</td>
</tr>
<tr>
<td style="padding:30px;background:#ffffff;">
<p style="margin:0 0 20px 0;">Seu acesso ao <strong>Código InstaShop</strong> foi liberado com sucesso!</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:2px solid #FFD700;border-radius:10px;margin:20px 0;">
<tr>
<td style="padding:20px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📋 Seus Dados de Acesso:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:12px;background:#fff;border-radius:5px;margin-bottom:10px;">
<span style="font-size:12px;color:#666;display:block;">Usuário:</span>
<span style="font-size:18px;color:#000;font-family:monospace;font-weight:bold;">${username}</span>
</td>
</tr>
<tr><td style="height:10px;"></td></tr>
<tr>
<td style="padding:12px;background:#fff;border-radius:5px;">
<span style="font-size:12px;color:#666;display:block;">Senha:</span>
<span style="font-size:18px;color:#000;font-family:monospace;font-weight:bold;">${password}</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:15px 0;">
<tr>
        <td style="background:${planType === "lifetime" ? "#d4edda" : planType === "trial" ? "#d1ecf1" : "#fff3cd"};border:1px solid ${planType === "lifetime" ? "#28a745" : planType === "trial" ? "#17a2b8" : "#ffc107"};border-radius:8px;padding:15px;text-align:center;">
          <span style="color:${planType === "lifetime" ? "#155724" : planType === "trial" ? "#0c5460" : "#856404"};font-weight:bold;">
          ${planType === "lifetime" ? "♾️ Acesso Vitalício - Sem data de expiração!" : planType === "trial" ? "🚀 Plano Teste - 30 dias de acesso (sem recorrência)" : "🎁 Plano Anual - 365 dias de acesso"}
          </span>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;margin:20px 0;">
<tr>
<td style="padding:20px;">
<h3 style="color:#333;margin:0 0 15px 0;font-size:16px;">📝 Como Acessar:</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:10px 0;border-bottom:1px solid #e0e0e0;">
<span style="display:inline-block;background:#FFD700;color:#000;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">1</span>
<span style="color:#333;">Acesse nossa página oficial</span>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #e0e0e0;">
<span style="display:inline-block;background:#FFD700;color:#000;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">2</span>
<span style="color:#333;">Clique em <strong>"Área de Membros"</strong></span>
</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #e0e0e0;">
<span style="display:inline-block;background:#FFD700;color:#000;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">3</span>
<span style="color:#333;">Insira seu <strong>usuário</strong> e <strong>senha</strong></span>
</td>
</tr>
<tr>
<td style="padding:10px 0;">
<span style="display:inline-block;background:#25D366;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-weight:bold;margin-right:10px;">✓</span>
<span style="color:#333;font-weight:bold;">Pronto! Aproveite a ferramenta!</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:10px 0;">
<a href="${memberAreaUrl}" style="display:inline-block;background:#000;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">🚀 ACESSAR ÁREA DE MEMBROS</a>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:25px;">
<tr>
<td align="center">
<a href="${supportWhatsappUrl}" style="display:inline-block;background:#25D366;color:#fff;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">📱 Falar no WhatsApp com Suporte</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="text-align:center;padding:20px;background:#f8f9fa;color:#666;font-size:11px;">
<p style="margin:0;">Código InstaShop</p>
</td>
</tr>
</table>
</body>
</html>`;
}

// Verificar se usuário já existe na API do SquareCloud
async function checkUserExists(username: string): Promise<boolean> {
  try {
    log("Checking if user exists", { username });
    const response = await fetch(`${INSTAGRAM_API_URL}/api/users/${username}`);
    
    if (response.status === 200) {
      const data = await response.json();
      const exists = !!(data && (data.username || data.id || data.success === true));
      log("User check result (200)", { username, exists });
      return exists;
    }
    
    if (response.status === 404) {
      log("User check result (404) - Not found", { username });
      return false;
    }

    const text = await response.text();
    if (text.toLowerCase().includes("já existe") || text.toLowerCase().includes("already exists")) {
      log("User check result (text) - Already exists", { username });
      return true;
    }

    return false;
  } catch (error) {
    log("Error checking user existence", { username, error: String(error) });
    return false;
  }
}

// Criar usuário na API SquareCloud/Instagram
async function createInstagramUser(username: string, password: string, daysAccess: number): Promise<{ success: boolean; alreadyExists: boolean; message: string }> {
  try {
    log("Creating Instagram user", { username, daysAccess });

    // Primeiro verificar se já existe
    const alreadyExists = await checkUserExists(username);
    if (alreadyExists) {
      log("User already exists - skipping creation", { username });
      return { 
        success: true, 
        alreadyExists: true, 
        message: "Usuário já existe - criado manualmente anteriormente" 
      };
    }

    // Primeiro habilitar usuário
    const enableResponse = await fetch(`${INSTAGRAM_API_URL}/habilitar-usuario/${username}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: username, senha: password }),
    });

    log("Enable user response", { status: enableResponse.status });

    // Adicionar usuário
    const addResponse = await fetch(`${INSTAGRAM_API_URL}/adicionar-usuario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        time: daysAccess,
        igUsers: "",
      }),
    });

    const result = await addResponse.json();
    log("Add user result", result);

    if (addResponse.ok || (result && (result.success === true || String(result.message).includes("já existe")))) {
      const alreadyExists = String(result.message).includes("já existe");
      return { 
        success: true, 
        alreadyExists: alreadyExists, 
        message: alreadyExists ? "Usuário já existe" : "Usuário criado com sucesso" 
      };
    } else {
      const existsNow = await checkUserExists(username);
      if (existsNow) {
        log("User creation failed but user exists - treating as success", { username });
        return { 
          success: true, 
          alreadyExists: true, 
          message: "Usuário já existia ou foi criado" 
        };
      }
      return { success: false, alreadyExists: false, message: result.message || "Erro ao criar usuário" };
    }
  } catch (error) {
    log("Error creating Instagram user", { error: String(error) });
    try {
      const existsNow = await checkUserExists(username);
      if (existsNow) {
        log("Error occurred but user exists - treating as manual creation", { username });
        return { 
          success: true, 
          alreadyExists: true, 
          message: "Usuário já existe (criado manualmente)" 
        };
      }
    } catch (e) { /* ignore */ }
    return { success: false, alreadyExists: false, message: String(error) };
  }
}

// Enviar email de acesso com fallback de porta
async function sendAccessEmail(
  customerEmail: string,
  username: string,
  password: string,
  planType: string
): Promise<boolean> {
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  if (!smtpPassword) {
    log("SMTP password not configured");
    return false;
  }

  const htmlContent = getEmailHtml(username, password, planType);
  const subject = "Código InstaShop - Acesso Liberado à Ferramenta Instagram!";

  // Tentar primeiro porta 465 (SSL/TLS)
  try {
    log("Attempting email send via port 465", { to: customerEmail });
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: {
          username: "suporte@codigoinstashop.com.br",
          password: smtpPassword,
        },
      },
    });

    await client.send({
      from: "Código InstaShop <suporte@codigoinstashop.com.br>",
      to: customerEmail,
      subject: subject,
      content: "Seu acesso foi liberado! Veja os detalhes no email.",
      html: htmlContent,
    });

    await client.close();
    log("Email sent successfully via 465");
    return true;
  } catch (error) {
    const errorStr = String(error);
    log("Error sending email via 465", { error: errorStr });
    
    if (errorStr.includes("554") && errorStr.includes("Disabled by user from hPanel")) {
      log("CRITICAL: Hostinger SMTP is DISABLED in hPanel for suporte@codigoinstashop.com.br. USER MUST UNBLOCK IN HPANEL.");
    }

    // Tentar fallback para porta 587 (STARTTLS)
    try {
      log("Attempting fallback email send via port 587", { to: customerEmail });
      const client587 = new SMTPClient({
        connection: {
          hostname: "smtp.hostinger.com",
          port: 587,
          tls: false,
          auth: {
            username: "suporte@codigoinstashop.com.br",
            password: smtpPassword,
          },
        },
      });

      await client587.send({
        from: "Código InstaShop <suporte@codigoinstashop.com.br>",
        to: customerEmail,
        subject: subject,
        content: "Seu acesso foi liberado! Veja os detalhes no email.",
        html: htmlContent,
      });

      await client587.close();
      log("Email sent successfully via 587 (fallback)");
      return true;
    } catch (fallbackError) {
      log("Error in both SMTP attempts", { 
        primary: errorStr, 
        fallback: String(fallbackError) 
      });
      return false;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Received webhook request");

    const verification = await verifyInfinitePayWebhook(req, corsHeaders, "INSTASHOP-PAYMENT-WEBHOOK");
    if (!verification.verified) {
      // No logs, it allows for now if secret is missing but warns in console
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const payload = verification.body;
    log("Webhook payload", payload);

    const manualApprove = payload.manual_approve === true;
    const forceResend = payload.force_resend === true;
    const resendType = (payload.resend_type as "api" | "email") || "email";
    const orderId = payload.order_id as string | undefined;
    const orderNsu = payload.order_nsu as string | undefined;

    let order = null;
    if (orderId) {
      const { data } = await supabase.from("mro_orders").select("*").eq("id", orderId).single();
      order = data;
    } else if (orderNsu) {
      const { data } = await supabase.from("mro_orders").select("*").eq("nsu_order", orderNsu).single();
      order = data;
    }

    if (!order) {
      log("No order found", { orderNsu, orderId });
      return new Response(JSON.stringify({ success: false, message: "No order found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Se já está completo e não for reenvio forçado
    if (order.status === "completed" && !manualApprove && !forceResend) {
      log("Order already completed", { orderId: order.id });
      return new Response(JSON.stringify({ success: true, status: "completed", order, message: "Already processed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    log("Processing order", { orderId: order.id, username: order.username, forceResend });

    // Marcar como pago se pendente
    if (order.status === "pending") {
      await supabase.from("mro_orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
    }

    const daysAccess = order.plan_type === "lifetime" ? 999999 : order.plan_type === "trial" ? 30 : 365;

    // Criar usuário se não for apenas reenvio de email
    let apiResult = { success: order.api_created || false, alreadyExists: false, message: "" };
    if (!forceResend || resendType === "api") {
      apiResult = await createInstagramUser(order.username, order.username, daysAccess);
    }

    // Email real do cliente
    let customerEmail = order.email;
    const emailParts = order.email.split(":");
    if (emailParts.length >= 2) customerEmail = emailParts.slice(1).join(":");

    // Enviar email se não enviado ou reenvio forçado
    let emailSent = order.email_sent || false;
    if (!emailSent || (forceResend && resendType === "email")) {
      emailSent = await sendAccessEmail(customerEmail, order.username, order.username, order.plan_type);
    }

    // Atualizar pedido
    const { error: finalUpdateError } = await supabase
      .from("mro_orders")
      .update({
        status: "completed",
        api_created: apiResult.success,
        email_sent: emailSent,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (finalUpdateError) log("Error updating order to completed", finalUpdateError);

    log("Order completed successfully", { orderId: order.id, apiCreated: apiResult.success, apiAlreadyExists: apiResult.alreadyExists, emailSent });

    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        order_id: order.id,
        api_created: apiResult.success,
        api_already_exists: apiResult.alreadyExists,
        api_message: apiResult.message,
        email_sent: emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    log("Critical error in webhook", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});