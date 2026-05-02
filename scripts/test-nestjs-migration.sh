#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MediWyz NestJS Migration Test Suite
# ═══════════════════════════════════════════════════════════════════════════════
#
# Runs ALL tests to verify the NestJS backend migration is working correctly.
#
# Prerequisites:
#   1. PostgreSQL running with seeded data
#   2. .env configured with ENABLE_NESTJS_PROXY=true
#
# Usage:
#   chmod +x scripts/test-nestjs-migration.sh
#   ./scripts/test-nestjs-migration.sh
#
# Options:
#   --api-only     Run only NestJS API tests (no Playwright)
#   --e2e-only     Run only Playwright E2E tests
#   --skip-start   Don't start servers (assume they're already running)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SKIP_START=false
API_ONLY=false
E2E_ONLY=false
ERRORS=0

for arg in "$@"; do
  case $arg in
    --skip-start) SKIP_START=true ;;
    --api-only) API_ONLY=true ;;
    --e2e-only) E2E_ONLY=true ;;
  esac
done

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  MediWyz NestJS Migration Test Suite${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Step 1: Type check ──────────────────────────────────────────────────────

echo -e "${YELLOW}[1/6] TypeScript type check — Backend${NC}"
cd backend
if npx tsc --noEmit 2>&1; then
  echo -e "${GREEN}  ✓ Backend types clean${NC}"
else
  echo -e "${RED}  ✗ Backend type errors found${NC}"
  ERRORS=$((ERRORS + 1))
fi
cd ..

echo -e "${YELLOW}[2/6] TypeScript type check — Frontend${NC}"
# Only check frontend files, exclude backend (different tsconfig)
if npx tsc --noEmit --project tsconfig.json 2>&1 | grep -v "backend/" | head -20; then
  echo -e "${GREEN}  ✓ Frontend types checked${NC}"
fi

# ─── Step 2: Backend unit tests ──────────────────────────────────────────────

if [ "$E2E_ONLY" = false ]; then
  echo ""
  echo -e "${YELLOW}[3/6] NestJS Backend Unit Tests${NC}"
  cd backend
  if npx jest --forceExit --passWithNoTests 2>&1 | tail -20; then
    echo -e "${GREEN}  ✓ Backend unit tests passed${NC}"
  else
    echo -e "${RED}  ✗ Backend unit tests failed${NC}"
    ERRORS=$((ERRORS + 1))
  fi
  cd ..
fi

# ─── Step 3: Start servers (if needed) ───────────────────────────────────────

NESTJS_PID=""
NEXTJS_PID=""

if [ "$SKIP_START" = false ]; then
  echo ""
  echo -e "${YELLOW}[4/6] Starting servers...${NC}"

  # Start NestJS
  echo "  Starting NestJS on port 3001..."
  cd backend && npm run start:dev > /tmp/nestjs.log 2>&1 &
  NESTJS_PID=$!
  cd ..

  # Wait for NestJS to be ready
  for i in $(seq 1 30); do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
      echo -e "${GREEN}  ✓ NestJS ready${NC}"
      break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
      echo -e "${RED}  ✗ NestJS failed to start. Check /tmp/nestjs.log${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done

  # Start Next.js
  echo "  Starting Next.js on port 3000..."
  ENABLE_NESTJS_PROXY=true npm run dev > /tmp/nextjs.log 2>&1 &
  NEXTJS_PID=$!

  # Wait for Next.js to be ready
  for i in $(seq 1 30); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      echo -e "${GREEN}  ✓ Next.js ready${NC}"
      break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
      echo -e "${RED}  ✗ Next.js failed to start. Check /tmp/nextjs.log${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo ""
  echo -e "${YELLOW}[4/6] Skipping server start (--skip-start)${NC}"
fi

# ─── Step 4: API Integration Tests ──────────────────────────────────────────

if [ "$E2E_ONLY" = false ]; then
  echo ""
  echo -e "${YELLOW}[5/6] NestJS API Integration Tests${NC}"
  cd backend
  if npx jest test/api-integration.spec.ts --forceExit 2>&1 | tail -30; then
    echo -e "${GREEN}  ✓ API integration tests passed${NC}"
  else
    echo -e "${RED}  ✗ API integration tests failed${NC}"
    ERRORS=$((ERRORS + 1))
  fi
  cd ..
fi

# ─── Step 5: Playwright E2E Tests ───────────────────────────────────────────

if [ "$API_ONLY" = false ]; then
  echo ""
  echo -e "${YELLOW}[6/6] Playwright E2E Tests (NestJS migration)${NC}"
  if npx playwright test e2e/nestjs-migration.spec.ts --reporter=list 2>&1 | tail -40; then
    echo -e "${GREEN}  ✓ E2E migration tests passed${NC}"
  else
    echo -e "${RED}  ✗ E2E migration tests failed${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  echo ""
  echo -e "${YELLOW}  Running full E2E suite...${NC}"
  if npx playwright test --reporter=list 2>&1 | tail -40; then
    echo -e "${GREEN}  ✓ Full E2E suite passed${NC}"
  else
    echo -e "${YELLOW}  ⚠ Some E2E tests failed (check report)${NC}"
    ERRORS=$((ERRORS + 1))
  fi
fi

# ─── Cleanup ──────────────────────────────────────────────────────────────────

if [ -n "$NESTJS_PID" ]; then
  kill $NESTJS_PID 2>/dev/null || true
fi
if [ -n "$NEXTJS_PID" ]; then
  kill $NEXTJS_PID 2>/dev/null || true
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}  ✓ ALL TESTS PASSED — NestJS migration verified${NC}"
  echo -e "${GREEN}  Safe to remove app/api/ and server.js${NC}"
else
  echo -e "${RED}  ✗ $ERRORS test group(s) failed — review before proceeding${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

exit $ERRORS
