#!/bin/bash
# MediWyz — Local Dev Startup Helper
#
# Starts the full MediWyz stack for local testing with NestJS backend:
#   1. PostgreSQL (via docker compose)
#   2. NestJS backend on :3001 (via npm run start:dev)
#   3. Next.js frontend on :3000 (in proxy mode)
#
# Usage:
#   ./backend/scripts/start-local.sh              # Start everything
#   ./backend/scripts/start-local.sh --no-seed    # Skip seeding
#   ./backend/scripts/start-local.sh --db-only    # Just start DB
#   ./backend/scripts/start-local.sh --seed-only  # Just reseed

set -e

cd "$(dirname "$0")/../.."

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SKIP_SEED=""
DB_ONLY=""
SEED_ONLY=""

for arg in "$@"; do
  case $arg in
    --no-seed)   SKIP_SEED=1 ;;
    --db-only)   DB_ONLY=1 ;;
    --seed-only) SEED_ONLY=1 ;;
  esac
done

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  MediWyz — Local Dev Startup${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

# ─── Step 1: Start PostgreSQL ─────────────────────────────────────────────
echo -e "\n${YELLOW}[1/4] Starting PostgreSQL...${NC}"
if docker ps --format '{{.Names}}' | grep -q mediwyz-db; then
  echo -e "${GREEN}  ✓ mediwyz-db container already running${NC}"
else
  docker compose up -d db
  echo -e "${GREEN}  ✓ Started mediwyz-db${NC}"
  echo -e "  Waiting for database to be ready..."
  sleep 3
fi

if [ -n "$DB_ONLY" ]; then
  echo -e "\n${GREEN}DB-only mode: PostgreSQL is running on :5432${NC}"
  exit 0
fi

# ─── Step 2: Prisma setup + seed ──────────────────────────────────────────
if [ -z "$SKIP_SEED" ]; then
  echo -e "\n${YELLOW}[2/4] Running Prisma db push + seed...${NC}"
  npx prisma db push --skip-generate
  npx prisma db seed
  echo -e "${GREEN}  ✓ Database seeded${NC}"
else
  echo -e "\n${YELLOW}[2/4] Skipping seed (--no-seed)${NC}"
fi

if [ -n "$SEED_ONLY" ]; then
  echo -e "\n${GREEN}Seed-only mode done${NC}"
  exit 0
fi

# ─── Step 3: Build NestJS backend ─────────────────────────────────────────
echo -e "\n${YELLOW}[3/4] Building NestJS backend...${NC}"
(cd backend && npx nest build)
echo -e "${GREEN}  ✓ NestJS build OK${NC}"

# ─── Step 4: Start instructions ───────────────────────────────────────────
echo -e "\n${YELLOW}[4/4] Ready to start services${NC}"
echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
echo -e "Open TWO terminals and run:"
echo ""
echo -e "  ${GREEN}Terminal 1 (NestJS backend on :3001):${NC}"
echo -e "    cd backend && npm run start:dev"
echo ""
echo -e "  ${GREEN}Terminal 2 (Next.js frontend on :3000):${NC}"
echo -e "    ENABLE_NESTJS_PROXY=true API_INTERNAL_URL=http://localhost:3001 npm run dev"
echo ""
echo -e "  ${GREEN}Terminal 3 (smoke test after both are up):${NC}"
echo -e "    node backend/test/e2e-new-endpoints.mjs"
echo -e "    node backend/test/e2e-full.mjs"
echo ""
echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}Test credentials (from seed):${NC}"
echo -e "  Patient:  emma.johnson@mediwyz.com / Patient123!"
echo -e "  Doctor:   dr.sarah@mediwyz.com / Doctor123!"
echo -e "  Admin:    hassan.doorgakant@healthways.mu / Admin123!"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
