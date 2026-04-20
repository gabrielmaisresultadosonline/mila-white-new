#!/usr/bin/env bash
###############################################################################
# Código InstaShop — Script de Instalação no VPS
# Domínio: codigoinstashop.com.br
#
# Uso (como root):
#   chmod +x install-codigoinstashop.sh
#   sudo ./install-codigoinstashop.sh
#
# O que ele faz:
#  1. Instala dependências (Node 20, Nginx, Certbot, Git)
#  2. Clona o repositório (ou atualiza se já existir)
#  3. Builda o projeto (Vite -> dist/)
#  4. Configura o Nginx para servir SPA + redirects HTTPS
#  5. Emite certificado SSL via Let's Encrypt
###############################################################################

set -euo pipefail

# ============= CONFIGURAÇÕES =================================================
DOMAIN="codigoinstashop.com.br"
WWW_DOMAIN="www.codigoinstashop.com.br"
EMAIL_LE="suporte@codigoinstashop.com.br"          # e-mail para Let's Encrypt
APP_DIR="/var/www/codigoinstashop"
REPO_URL="${REPO_URL:-}"                            # passe via env: REPO_URL=https://...
NGINX_CONF="/etc/nginx/sites-available/codigoinstashop"
NGINX_LINK="/etc/nginx/sites-enabled/codigoinstashop"
NODE_MAJOR="20"
# =============================================================================

log()  { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[ OK ]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR ]\033[0m $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "Rode como root: sudo $0"
  exit 1
fi

# ----- 1. Dependências -------------------------------------------------------
log "Atualizando pacotes e instalando dependências..."
apt-get update -y
apt-get install -y curl git nginx ufw ca-certificates gnupg lsb-release software-properties-common

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]]; then
  log "Instalando Node.js $NODE_MAJOR..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v) / npm $(npm -v)"

if ! command -v certbot >/dev/null 2>&1; then
  log "Instalando Certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

# ----- 2. Código fonte -------------------------------------------------------
mkdir -p "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  log "Repo existente em $APP_DIR — atualizando..."
  git -C "$APP_DIR" pull --ff-only
elif [[ -n "$REPO_URL" ]]; then
  log "Clonando $REPO_URL em $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
else
  warn "REPO_URL não definido. Faça upload manual dos arquivos para $APP_DIR."
  warn "Ou rode novamente: REPO_URL=https://github.com/seu-user/seu-repo.git sudo ./install-codigoinstashop.sh"
fi

# ----- 3. Build --------------------------------------------------------------
if [[ -f "$APP_DIR/package.json" ]]; then
  log "Instalando dependências e buildando..."
  cd "$APP_DIR"
  npm ci || npm install
  npm run build
  ok "Build gerado em $APP_DIR/dist"
else
  warn "package.json não encontrado em $APP_DIR — pulando build."
fi

# ----- 4. Nginx --------------------------------------------------------------
log "Configurando Nginx para $DOMAIN..."
cat > "$NGINX_CONF" <<NGINX
# HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    # Permite challenges Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$DOMAIN\$request_uri;
    }
}

# HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache de estáticos
    location ~* \.(?:js|css|woff2?|ttf|otf|eot|ico|png|jpg|jpeg|gif|webp|svg|mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Segurança básica
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    access_log /var/log/nginx/codigoinstashop.access.log;
    error_log  /var/log/nginx/codigoinstashop.error.log;
}
NGINX

ln -sf "$NGINX_CONF" "$NGINX_LINK"
rm -f /etc/nginx/sites-enabled/default || true

log "Testando configuração do Nginx..."
nginx -t
systemctl reload nginx
ok "Nginx recarregado."

# ----- 5. Firewall -----------------------------------------------------------
if command -v ufw >/dev/null 2>&1; then
  log "Liberando portas no UFW..."
  ufw allow 'Nginx Full' || true
  ufw allow OpenSSH || true
fi

# ----- 6. SSL ----------------------------------------------------------------
log "Emitindo certificado SSL para $DOMAIN e $WWW_DOMAIN..."
certbot --nginx \
  -d "$DOMAIN" -d "$WWW_DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL_LE" --redirect || \
  warn "Falha no Certbot — verifique se o DNS aponta para este servidor."

systemctl enable --now certbot.timer || true

ok "===================================================="
ok " Instalação concluída!"
ok " Acesse: https://$DOMAIN"
ok " Diretório: $APP_DIR"
ok " Para atualizar: cd $APP_DIR && git pull && npm ci && npm run build && systemctl reload nginx"
ok "===================================================="
