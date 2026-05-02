#!/bin/bash
# MediWyz NestJS Backend — Test Runner Script
# Usage:
#   ./scripts/run-tests.sh              # Run all tests
#   ./scripts/run-tests.sh --watch      # Run in watch mode
#   ./scripts/run-tests.sh --coverage   # Run with coverage
#   ./scripts/run-tests.sh auth         # Run specific module tests
#   ./scripts/run-tests.sh --verbose    # Verbose output

set -e

cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  MediWyz NestJS Backend — Test Suite${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Parse arguments
WATCH=""
COVERAGE=""
VERBOSE=""
MODULE=""

for arg in "$@"; do
  case $arg in
    --watch)
      WATCH="--watch"
      ;;
    --coverage)
      COVERAGE="--coverage"
      ;;
    --verbose)
      VERBOSE="--verbose"
      ;;
    *)
      MODULE="$arg"
      ;;
  esac
done

# Count test files
TEST_COUNT=$(find src -name "*.spec.ts" | wc -l)
echo -e "${GREEN}Found ${TEST_COUNT} test file(s)${NC}"
echo ""

# List test files
echo -e "${YELLOW}Test files:${NC}"
find src -name "*.spec.ts" | sort | while read f; do
  echo "  - $f"
done
echo ""

# Build test command
CMD="npx jest"

if [ -n "$MODULE" ]; then
  echo -e "${CYAN}Running tests for module: ${MODULE}${NC}"
  CMD="$CMD --testPathPattern=$MODULE"
fi

if [ -n "$WATCH" ]; then
  echo -e "${CYAN}Watch mode enabled${NC}"
  CMD="$CMD $WATCH"
fi

if [ -n "$COVERAGE" ]; then
  echo -e "${CYAN}Coverage enabled${NC}"
  CMD="$CMD $COVERAGE"
fi

if [ -n "$VERBOSE" ]; then
  CMD="$CMD $VERBOSE"
fi

# Add color and summary
CMD="$CMD --colors --passWithNoTests"

echo -e "${CYAN}Running: ${CMD}${NC}"
echo -e "${CYAN}------------------------------------------------${NC}"
echo ""

eval $CMD

EXIT_CODE=$?

echo ""
echo -e "${CYAN}================================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}  All tests passed!${NC}"
else
  echo -e "${RED}  Some tests failed (exit code: $EXIT_CODE)${NC}"
fi
echo -e "${CYAN}================================================${NC}"

exit $EXIT_CODE
