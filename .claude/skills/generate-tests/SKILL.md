---
description: Generate Vitest unit tests for a backend service file or frontend hook
---

# Generate Tests

When the user points to a file and asks "write tests for this".

## Process

1. **Read the target file** end-to-end.
2. **Identify the public surface**: exported functions, class methods, hooks.
3. **For each public method**, derive at least 3 test cases:
   - Happy path with realistic inputs
   - One edge case (empty input, boundary value, null)
   - One failure path (throws, returns null, etc.)
4. **Mock dependencies** per `.claude/rules/testing.md`:
   - Prisma → `vi.mock('@/lib/db')` or `vi.mock('../prisma/prisma.service')`
   - Auth → `vi.mock('@/lib/auth/validate')`
   - HTTP → `vi.mock('node-fetch')` or use MSW
5. **Write the spec** in the file's sibling: `service.ts` → `service.spec.ts`.
6. **Run** `npx vitest run path/to/spec` and confirm green before reporting done.

## Conventions

- `describe('ClassName', () => describe('methodName', () => it(...)))`.
- One assertion per `it` when possible; group setup in `beforeEach`.
- Use `expect(fn).rejects.toThrow(BadRequestException)` for async errors.
- Custom IDs (`PAT001`, `DOC001`) work alongside UUIDs — test both.

## What NOT to test

- ❌ Type definitions (TypeScript already covers them)
- ❌ Trivial getters/setters
- ❌ Third-party library internals
- ❌ Implementation details (private methods) — test the public contract

## Output

The new spec file plus a one-line summary: `Added N tests covering M cases. All passing.`
