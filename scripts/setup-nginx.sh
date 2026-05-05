#!/usr/bin/env bash
# scripts/setup-nginx.sh
# Configure nginx reverse proxy + obtain/renew SSL cert for mediwyz.com
# Usage: APP_DOMAIN=mediwyz.com ADMIN_EMAIL=admin@mediwyz.com bash scripts/setup-nginx.sh

set -e

DOMAIN="${APP_DOMAIN:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@mediwyz.com}"

if [ -z "$DOMAIN" ]; then
  echo "APP_DOMAIN not set — skipping nginx setup"
  exit 0
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not installed — skipping nginx setup"
  exit 0
fi

echo "=== Configuring nginx for $DOMAIN ==="

# ── Find cert dir dynamically (handles -0001 suffix from re-issue) ─────────
CERT_DIR=$(ls -d /etc/letsencrypt/live/${DOMAIN}* 2>/dev/null | head -1 || true)
HAS_CERT=0
if [ -n "$CERT_DIR" ] && [ -f "$CERT_DIR/fullchain.pem" ]; then
  HAS_CERT=1
  echo "Found existing cert at: $CERT_DIR"
fi

# ── Write HTTP-only config (needed for ACME webroot challenge) ──────────────
sudo tee /etc/nginx/sites-available/mediwyz > /dev/null << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/mediwyz /etc/nginx/sites-enabled/mediwyz
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx && echo "nginx reloaded (HTTP config)"

# ── Obtain cert if not yet present ──────────────────────────────────────────
if [ "$HAS_CERT" = "0" ]; then
  if command -v certbot >/dev/null 2>&1; then
    echo "=== Requesting SSL certificate for $DOMAIN ==="
    sudo mkdir -p /var/www/html/.well-known/acme-challenge
    if sudo certbot certonly --webroot -w /var/www/html \
      -d "$DOMAIN" -d "www.$DOMAIN" \
      --non-interactive --agree-tos \
      -m "$ADMIN_EMAIL" 2>&1; then
      # Re-detect cert dir after successful issuance
      CERT_DIR=$(ls -d /etc/letsencrypt/live/${DOMAIN}* 2>/dev/null | head -1 || true)
      [ -n "$CERT_DIR" ] && [ -f "$CERT_DIR/fullchain.pem" ] && HAS_CERT=1
    else
      echo "WARNING: certbot failed — app accessible on HTTP only for now"
    fi
  fi
fi

# ── If cert exists, add HTTPS server block ────────────────────────────────
if [ "$HAS_CERT" = "1" ] && [ -n "$CERT_DIR" ]; then
  echo "=== Adding HTTPS server block (cert: $CERT_DIR) ==="
  sudo tee /etc/nginx/sites-available/mediwyz > /dev/null << HTTPSEOF
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate     ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
HTTPSEOF

  sudo nginx -t && sudo systemctl reload nginx && echo "nginx reloaded with HTTPS for $DOMAIN"
else
  echo "No cert available — running HTTP only"
fi
