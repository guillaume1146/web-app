# Comprehensive Testing — Hard Rule

Every layer of MediWyz has a testing discipline. This rule says what to test, which library to use per layer, and the architecture decisions we lock in.

## Testing pyramid (our allocation)

```
        ┌───────────────┐
        │   E2E (5%)    │  Playwright (web), Flutter integration_test (mobile)
        │───────────────│
        │Integration20% │  NestJS module + in-memory DB, Flutter widget tests against mocked APIs
        │───────────────│
        │ Unit (75%)    │  Vitest (frontend), Jest (backend), flutter_test (mobile)
        └───────────────┘
```

Why 75% unit: pure functions + service logic is where regressions hide + they run fastest (sub-second CI).

## Library canon (never deviate without an ADR)

| Layer | Library | Runner | Coverage |
|---|---|---|---|
| Backend unit (services, strategies, validators) | **Jest** (`@nestjs/testing`) | `npx jest` | branch ≥ 80% |
| Backend integration (controllers + Prisma) | Jest + `@nestjs/testing` + testcontainers Postgres | `npx jest --config jest-integration.json` | critical paths |
| Frontend unit (utils, hooks, lib/*) | **Vitest** + `@testing-library/react` + `jsdom` | `npx vitest run` | branch ≥ 70% |
| Frontend component (interactive UI) | Vitest + `@testing-library/react` + `@testing-library/user-event` | same | interaction flows |
| Frontend E2E | **Playwright** (Chromium + Webkit) | `npx playwright test` | golden paths |
| Flutter unit | **flutter_test** (built-in) | `flutter test` | pure model logic |
| Flutter widget | flutter_test + mock `ApiClient` via `dio_mock` or hand-rolled mocks | `flutter test` | state + rendering |
| Flutter integration | **integration_test** package | `flutter test integration_test/` | boot + auth + navigate |
| Socket.IO / realtime | Jest + `socket.io-client` in-memory server | `npx jest socket` | event contracts |
| Visual regression | **Playwright snapshots** (limited — only design-token-sensitive screens) | `npx playwright test --project=visual` | brand critical |
| Performance | **Lighthouse CI** for web, `flutter drive --profile` for mobile | CI stage | core pages only |

Hard rules:
- Backend files MUST have jest-style syntax (`describe`, `it`, `jest.fn`). Vitest runner ignores `backend/`.
- Frontend files MUST have vitest-compatible imports (`vi.fn`, `vi.mock`). Jest runner ignores `app/`, `components/`, `hooks/`.
- Flutter tests MUST live under `mobile/test/**` or `mobile/integration_test/**` and use `flutter_test`.
- NO test file imports from a different layer's test helpers.

## What to test at each layer

### Backend — Services
- Every public method gets at least one happy-path test + one edge-case.
- Every `throw new …Exception` line has a test that triggers it.
- Validation logic (DTOs) gets a case-per-constraint.
- Cross-service calls are mocked (don't test the dependency's behaviour here).

### Backend — Controllers
- Test the controller's **legacy-alias handling** (e.g. `doctorId` → `providerUserId` fold).
- Response shape (`{ success, data }`) — snapshot or explicit shape assertions.
- Error mapping (GlobalExceptionFilter formatting).

### Backend — Strategies / Domain
- Each workflow strategy (`strategies/*.strategy.ts`) gets a spec confirming: trigger match, no-match, side-effect invocation, idempotency.
- Each repository class tested against in-memory Prisma mocks; no integration DB needed.

### Frontend — Utilities
- Pure functions: table-driven tests.
- Currency formatters, date formatters, i18n resolvers — exhaustive.

### Frontend — Hooks
- Custom hooks (`useCorporateCapability`, `useDynamicSearchItems`) tested with `renderHook`.
- Mock global `fetch` with `vi.fn()`.

### Frontend — Components
- Interactive components: full user flow with `@testing-library/user-event` — type, click, submit.
- Empty state, loading state, error state — each gets a test.
- Snapshot tests forbidden except for pure presentational components.

### Flutter — Models / Services
- Pure model logic: `CartLine.copyWith`, `CartState.total`, `Notifier.add/remove`.
- Riverpod notifiers tested with `ProviderContainer`.

### Flutter — Widgets
- Render contract: given props, what appears?
- State transitions: `setState` → next frame matches expectation.
- Accessibility: `Semantics` labels on critical interactive widgets.

### Flutter — Integration
- Boot the real app in `integration_test/`, navigate, assert.
- Only smoke tests at the integration layer — don't duplicate widget tests.

### E2E — Playwright
- **Golden paths only**: signup → first booking → pay → join video
- Run one golden path per provider type in parallel
- Visual snapshots reserved for brand-critical pages (login, dashboard shell)

## Coverage targets (enforced in CI)

| Path | Branch | Lines | Statements |
|---|---|---|---|
| `backend/src/**/*.service.ts` | 80% | 85% | 85% |
| `backend/src/**/*.controller.ts` | 70% | 75% | 75% |
| `backend/src/shared/**` | 90% | 90% | 90% |
| `lib/**/*.ts` (frontend utils) | 70% | 75% | 75% |
| `components/**/*.tsx` | 50% | 60% | 60% |
| `hooks/**/*.ts` | 80% | 80% | 80% |
| `mobile/lib/**/*.dart` | 60% | 65% | 65% |

Below the target = CI fails OR the PR describes why (with a tracked follow-up).

## Architecture best practices that feed test quality

### Design patterns in use (documented in `.claude/rules/design-patterns.md`)
- **Strategy** (workflow flags) — each strategy easily isolated for testing
- **Repository** (data access) — swap for in-memory in tests
- **Template Method** (`transition()` pipeline) — test each step independently
- **Capability check** — `userHasCorporateCapability()` returns a bool; easy to mock
- **Service + DTO** — never test a controller with a real service; always mock

### Folder conventions that help testing
```
backend/src/<module>/
├── <module>.controller.ts           # thin, no business logic
├── <module>.controller.spec.ts      # test alias handling, response shape
├── <module>.service.ts              # all logic + Prisma
├── <module>.service.spec.ts         # primary unit tests
├── <module>.module.ts
└── dto/
    ├── *.dto.ts                     # class-validator
    └── *.dto.spec.ts                # validation tests per constraint

components/<feature>/
├── Feature.tsx
├── Feature.test.tsx                 # Vitest + RTL, interaction flows
├── __tests__/                       # shared fixtures
└── components/                       # sub-widgets

mobile/lib/<layer>/<feature>.dart
mobile/test/<layer>/<feature>_test.dart   # mirror folder

e2e/
├── golden-path.spec.ts              # signup-to-first-booking
└── fixtures/                         # shared test data
```

### Object-oriented sanity
- Depend on **abstractions** (interfaces / abstract classes) where substitution matters.
- **No static state** in classes — use DI (NestJS already enforces this backend-side).
- **Favour composition over inheritance** — React component composition, Flutter widget composition.
- **Law of Demeter**: don't reach three levels deep into an object. Return only what the caller needs.
- Pure functions default — classes only when state is truly needed.

### Readable tests
- `describe` = the subject under test. `it` = the behaviour.
- `arrange / act / assert` sections separated by blank lines.
- No conditionals in test bodies (except inside `expect`-style helpers).
- One concept per test; name says the concept.

## Forbidden patterns

- ❌ `vi.mock` in a backend file (Vitest-only API in a Jest runner)
- ❌ `jest.mock` in a frontend file (mirror)
- ❌ Testing implementation details (internal class fields, `spy.calls[0].args`) instead of behaviour
- ❌ Tests that rely on CI-only fixtures (hardcoded IDs from the production DB)
- ❌ Sleep / setTimeout in tests (use `await fixture.loadDone()`, `await waitFor(…)`)
- ❌ A `.skip` or `.only` in merged code
- ❌ Fixing a test by widening an assertion (`toBeGreaterThan(0)` instead of `toBe(5)`) without comment
- ❌ Mocking the thing under test
- ❌ Shared mutable state between tests (always reset in `beforeEach`)
- ❌ New dependency added without a test covering its integration point

## PR test-coverage checklist

Before merge, confirm:
1. Each new/changed service method has a unit test
2. Each new/changed controller alias/transform has a controller-spec test
3. Each new React component has at least empty + filled + error state tests
4. Each new Flutter widget has at least a render contract test
5. Each new socket event has a contract test
6. Existing tests still pass (`npm test && cd backend && npx jest && cd ../mobile && flutter test`)
7. CI coverage thresholds met on touched files
8. No `.skip` / `.only` in the diff
9. If a test was deleted, the PR body explains why
10. E2E golden path still green on local + staging
