#!/usr/bin/env bash
###############################################################################
# Mila White / Código InstaShop — Instalação Automática (Ubuntu 22.04 LTS)
# Repositório: https://github.com/gabrielmaisresultadosonline/mila-white-new
#
# USO (one-line no terminal da Hostinger / VPS Ubuntu 22.04):
#
#   curl -fsSL https://raw.githubusercontent.com/gabrielmaisresultadosonline/mila-white-new/main/deploy/install-mila-white.sh | sudo bash
#
# Pronto! Sem precisar passar nada. Domínio fixo: codigoinstashop.com.br
#
# (Opcional) Sobrescrever variáveis:
#   DOMAIN  -> domínio principal      (default: codigoinstashop.com.br)
#   EMAIL   -> email Let's Encrypt    (default: suporte@codigoinstashop.com.br)
#                ↑ usado APENAS pelo Certbot para enviar avisos de expiração
#                  do certificado SSL. Pode ser qualquer email seu válido.
#   BRANCH  -> branch git             (default: main)
#
# O que faz:
#  1. Atualiza Ubuntu + instala Node 20, Nginx, Certbot, Git
#  2. Clona/atualiza o repositório em /var/www/mila-white
#  3. npm install + build (Vite -> dist/)
#  4. Configura Nginx (SPA + gzip + cache + upload 100M)
#  5. Emite SSL automático (Let's Encrypt) p/ domínio + www
#  6. Habilita renovação automática
###############################################################################
set -euo pipefail

# ============= CONFIG ========================================================
DOMAIN="${DOMAIN:-codigoinstashop.com.br}"
WWW_DOMAIN="www.${DOMAIN}"
EMAIL="${EMAIL:-suporte@codigoinstashop.com.br}"
BRANCH="${BRANCH:-main}"
REPO_URL="https://github.com/gabrielmaisresultadosonline/mila-white-new.git"
APP_DIR="/var/www/mila-white"
NGINX_CONF="/etc/nginx/sites-available/mila-white"
NGINX_LINK="/etc/nginx/sites-enabled/mila-white"
NODE_MAJOR="20"
# =============================================================================

bold(){ echo -e "\n\033[1;36m==> $*\033[0m"; }
ok(){   echo -e "\033[1;32m✔ $*\033[0m"; }
err(){  echo -e "\033[1;31m✘ $*\033[0m" >&2; }

if [[ $EUID -ne 0 ]]; then err "Execute como root (sudo)."; exit 1; fi

bold "Domínio: $DOMAIN  |  Email LE: $EMAIL  |  Branch: $BRANCH"

# ---------- 1. Sistema ------------------------------------------------------
bold "Atualizando pacotes do sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ca-certificates gnupg ufw nginx software-properties-common

# ---------- 2. Node 20 ------------------------------------------------------
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" != "$NODE_MAJOR" ]]; then
  bold "Instalando Node.js $NODE_MAJOR..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v)  npm $(npm -v)"

# ---------- 3. Certbot ------------------------------------------------------
bold "Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx

# ---------- 4. Firewall -----------------------------------------------------
bold "Configurando firewall (UFW)..."
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true

# ---------- 5. Código -------------------------------------------------------
bold "Obtendo código do repositório..."
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# ---------- 6. Build --------------------------------------------------------
bold "Instalando dependências e buildando..."
cd "$APP_DIR"
npm ci || npm install
npm run build
[[ -d "$APP_DIR/dist" ]] || { err "Build falhou: dist/ não existe."; exit 1; }
chown -R www-data:www-data "$APP_DIR/dist"

# ---------- 7. Nginx (HTTP) -------------------------------------------------
bold "Configurando Nginx..."
cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    client_max_body_size 100M;

    # ACME challenge (Let's Encrypt) — precisa vir ANTES de qualquer outra regra
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root $APP_DIR/dist;
        try_files \$uri =404;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|webp|mp4)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
EOF

ln -sf "$NGINX_CONF" "$NGINX_LINK"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------- 8. SSL ----------------------------------------------------------
bold "Emitindo certificado SSL (Let's Encrypt) via webroot..."
certbot certonly --webroot -w "$APP_DIR/dist" \
  -d "$DOMAIN" -d "$WWW_DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" \
  --preferred-challenges http \
  && certbot install --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --redirect --non-interactive \
  || err "Certbot falhou — se você usa Cloudflare, DESATIVE o PROXY (nuvem cinza) até o certificado ser emitido, depois reative em modo Full (strict)."

systemctl enable certbot.timer
systemctl start  certbot.timer

# ---------- 9. Done ---------------------------------------------------------
bold "Instalação concluída!"
ok "Site:  https://$DOMAIN"
ok "WWW:   https://$WWW_DOMAIN"
echo
echo "Para atualizar o site no futuro, rode:"
echo "  cd $APP_DIR && git pull && npm ci && npm run build && systemctl reload nginx"
