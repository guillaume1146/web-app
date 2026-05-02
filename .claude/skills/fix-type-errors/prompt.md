---
description: Find and fix TypeScript errors in both backend and frontend
user-invocable: true
---

# Fix TypeScript Errors

## Steps

1. **Backend type check**:
   ```bash
   cd backend && npx tsc --noEmit
   ```
   Fix all errors. Common issues:
   - Missing properties on Prisma types (schema changed)
   - Incorrect parameter types in service methods
   - Missing imports

2. **Frontend type check**:
   ```bash
   npx tsc --noEmit
   ```
   Ignore errors from `backend/` (different tsconfig). Fix frontend errors.

3. **For each error**:
   - Read the file at the error line
   - Understand the type mismatch
   - Fix with the minimal correct change
   - Don't add `any` types — find the proper type

4. **Re-run type check** to verify all errors are resolved

5. **Run tests** to ensure no regressions:
   ```bash
   cd backend && npx jest --forceExit --passWithNoTests
   npx vitest run
   ```
