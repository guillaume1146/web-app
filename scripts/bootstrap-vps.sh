#!/usr/bin/env bash
# scripts/bootstrap-vps.sh
# One-time setup for the MediWyz production VPS (cloud.mu — Ubuntu 22.04/24.04)
#
# Run as root on the VPS:
#   bash <(curl -fsSL https://raw.githubusercontent.com/Mediwyz/platform/main/scripts/bootstrap-vps.sh)
#
# Or copy the file and run:
#   bash scripts/bootstrap-vps.sh
#
# After this script: register the GitHub Actions runner (step 5 output gives the command).

set -euo pipefail

REPO="https://github.com/Mediwyz/platform.git"
DEPLOY_DIR="/root/mediwyz"
RUNNER_VERSION="2.316.1"
RUNNER_DIR="/root/actions-runner"
RUNNER_LABEL="mediwyz"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERR ]${NC} $*"; exit 1; }

[ "$(id -u)" = "0" ] || error "Must run as root"

# ── 1. System packages ────────────────────────────────────────────────────────
info "Step 1/6 — System packages"
apt-get update -qq
apt-get install -y -qq \
  curl git nginx certbot python3-certbot-nginx \
  ca-certificates gnupg lsb-release ufw \
  apt-transport-https software-properties-common

# ── 2. Docker ─────────────────────────────────────────────────────────────────
info "Step 2/6 — Docker"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
     https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  info "Docker installed: $(docker --version)"
else
  info "Docker already installed: $(docker --version)"
fi

# ── 3. Clone / update repo ────────────────────────────────────────────────────
info "Step 3/6 — Repository at $DEPLOY_DIR"
if [ -d "$DEPLOY_DIR/.git" ]; then
  info "Repo already cloned — pulling latest"
  git -C "$DEPLOY_DIR" remote set-url origin "$REPO" 2>/dev/null || true
  git -C "$DEPLOY_DIR" pull origin main
else
  git clone "$REPO" "$DEPLOY_DIR"
  info "Repo cloned to $DEPLOY_DIR"
fi

# Create uploads directory with right permissions
mkdir -p "$DEPLOY_DIR/public/uploads"
chmod 755 "$DEPLOY_DIR/public/uploads"

# ── 4. Firewall ───────────────────────────────────────────────────────────────
info "Step 4/6 — Firewall (UFW)"
ufw --force reset > /dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP"
ufw allow 443/tcp   comment "HTTPS"
ufw --force enable
info "UFW enabled (22, 80, 443 open)"

# ── 5. GitHub Actions self-hosted runner ─────────────────────────────────────
info "Step 5/6 — GitHub Actions runner"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

ARCH="linux-x64"
RUNNER_TAR="actions-runner-${ARCH}-${RUNNER_VERSION}.tar.gz"

if [ ! -f "./run.sh" ]; then
  info "Downloading runner v$RUNNER_VERSION..."
  curl -fsSLO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_TAR}"
  tar xzf "$RUNNER_TAR"
  rm -f "$RUNNER_TAR"
  ./bin/installdependencies.sh
  info "Runner binaries ready"
else
  info "Runner already downloaded"
fi

cd "$DEPLOY_DIR"

# ── 6. nginx — HTTP-only config (HTTPS added by certbot later) ────────────────
info "Step 6/6 — nginx default config"
# We write a minimal HTTP config now; the deploy pipeline overwrites it with
# the full config (including SSL) via scripts/setup-nginx.sh.
cat > /etc/nginx/sites-available/mediwyz << 'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/mediwyz /etc/nginx/sites-enabled/mediwyz
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl enable --now nginx && systemctl reload nginx
info "nginx running"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Bootstrap complete — 2 manual steps left           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}STEP A — Register the GitHub Actions runner:${NC}"
echo ""
echo "  1. Go to: https://github.com/Mediwyz/platform/settings/actions/runners/new"
echo "  2. Select Linux / x64"
echo "  3. Copy the token from the page, then run:"
echo ""
echo "     cd $RUNNER_DIR"
echo "     ./config.sh \\"
echo "       --url https://github.com/Mediwyz/platform \\"
echo "       --token <PASTE_TOKEN_HERE> \\"
echo "       --name mediwyz-prod \\"
echo "       --labels mediwyz \\"
echo "       --unattended"
echo "     sudo ./svc.sh install && sudo ./svc.sh start"
echo ""
echo -e "${YELLOW}STEP B — Set these GitHub repository secrets:${NC}"
echo "  (https://github.com/Mediwyz/platform/settings/secrets/actions)"
echo ""
echo "  Secret name               Value"
echo "  ─────────────────────────────────────────────────────────────"
echo "  VPS_HOST                  102.222.105.151"
echo "  DEPLOY_DIR                mediwyz"
echo "  POSTGRES_PASSWORD         <strong-password>"
echo "  DATABASE_URL              postgresql://mediwyz:<POSTGRES_PASSWORD>@db:5432/mediwyz"
echo "  JWT_SECRET                <random-64-char-string>"
echo "  GROQ_API_KEY              <from console.groq.com>"
echo "  APP_DOMAIN                mediwyz.com  (or leave empty for IP-only)"
echo "  SUPER_ADMIN_EMAIL         your@email.com"
echo "  SUPER_ADMIN_PASSWORD      <admin-password>"
echo "  SUPER_ADMIN_FIRST_NAME    Guillaume"
echo "  SUPER_ADMIN_LAST_NAME     Rakotonjanahary"
echo ""
echo "  Generate JWT_SECRET with:"
echo "  node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""
echo -e "${GREEN}After both steps, push any commit to main to trigger the first deploy.${NC}"
echo ""
