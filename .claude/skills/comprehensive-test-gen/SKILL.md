---
description: Generate a complete test suite for a given source file — unit + component/widget + integration as appropriate — matching the codebase's library canon (Jest backend, Vitest frontend, flutter_test mobile, Playwright E2E). Use when a file lacks coverage or when a reviewer flagged missing tests.
---

# Comprehensive Test Generator

Takes one source file and produces the right tests for its layer + behaviour. Knows which library to use, what patterns the codebase already uses, and what coverage thresholds to hit.

## When to use
- A service / controller / component / widget has no test file
- The test-coverage-reviewer flagged missing coverage
- You're about to ship a new feature and want scaffolded tests

## Method

### 1. Classify the file
| Path pattern | Layer | Library |
|---|---|---|
| `backend/src/**/*.service.ts` | backend service | Jest |
| `backend/src/**/*.controller.ts` | backend controller | Jest |
| `backend/src/**/*.strategy.ts` | backend strategy | Jest |
| `backend/src/**/dto/*.ts` | backend DTO | Jest |
| `backend/src/**/*.gateway.ts` | socket gateway | Jest |
| `hooks/**/*.ts` / `lib/**/*.ts` | frontend util / hook | Vitest |
| `components/**/*.tsx` | React component | Vitest + Testing Library |
| `app/**/*.tsx` | Next.js page | Vitest + MSW (mock fetch) |
| `mobile/lib/services/*.dart` | Flutter service / notifier | flutter_test |
| `mobile/lib/widgets/*.dart` | Flutter widget | flutter_test |
| `mobile/lib/screens/*.dart` | Flutter screen | flutter_test (widget) + optional integration_test |
| `e2e/**/*.ts` | E2E flow | Playwright |

### 2. Read the file fully
- Enumerate public methods / exports / props
- Note external dependencies (Prisma, fetch, Socket.IO, Dio)
- Note thrown exceptions / error cases
- Note branches (`if`, `switch`, `??`, `||`, `try/catch`)

### 3. Pick test layer per method
Rule of thumb:
- Pure functions → unit
- Uses Prisma → service unit test with mocked Prisma
- Uses `fetch` → component/hook test with `vi.fn()` mock
- Uses Socket → gateway unit test with in-memory server
- Multi-screen flow → E2E (Playwright)

### 4. Generate the tests

#### Template — backend service
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { FooService } from './foo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FooService', () => {
  let service: FooService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      foo: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn().mockImplementation(async fn => fn(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [FooService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(FooService);
  });

  describe('methodName', () => {
    it('does the happy path', async () => {
      // arrange
      prisma.foo.findFirst.mockResolvedValueOnce({ id: '1' });
      // act
      const result = await service.methodName('input');
      // assert
      expect(result.id).toBe('1');
    });

    it('throws on missing input', async () => {
      await expect(service.methodName('')).rejects.toThrow(BadRequestException);
    });

    it('handles the edge case', async () => { /* ... */ });
  });
});
```

#### Template — backend controller (alias / transform)
```ts
describe('FooController — legacy aliases', () => {
  let controller: FooController;
  let service: { doThing: jest.Mock };

  beforeEach(async () => {
    service = { doThing: jest.fn().mockResolvedValue({ id: 'X' }) };
    const module = await Test.createTestingModule({
      controllers: [FooController],
      providers: [{ provide: FooService, useValue: service }],
    }).compile();
    controller = module.get(FooController);
  });

  it('accepts legacy field X and forwards as canonical Y', async () => {
    await controller.create({ legacyX: 'abc' } as any, { sub: 'U1' } as any);
    expect(service.doThing).toHaveBeenCalledWith('U1', expect.objectContaining({ canonicalY: 'abc' }));
  });
});
```

#### Template — React component
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn() as any;
  });

  it('renders the empty state with a CTA', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true, json: async () => ({ success: true, data: [] })
    });
    render(<MyComponent />);
    expect(await screen.findByText(/no items yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders items after fetch', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true, json: async () => ({ success: true, data: [{ id: '1', name: 'Alpha' }] })
    });
    render(<MyComponent />);
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
  });

  it('shows an error message on failure', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true, json: async () => ({ success: false, message: 'Boom' })
    });
    render(<MyComponent />);
    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('calls submit handler on button click', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    await user.type(screen.getByLabelText(/name/i), 'Hello');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });
});
```

#### Template — Riverpod notifier / service
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mediwyz_mobile/services/cart_service.dart';

void main() {
  group('CartService', () {
    late ProviderContainer container;
    setUp(() => container = ProviderContainer());
    tearDown(() => container.dispose());

    CartLine _line(String id, {int qty = 1}) =>
      CartLine(itemId: id, providerUserId: 'P1', providerName: 'X',
               name: 'i', price: 10, quantity: qty);

    test('starts empty', () {
      expect(container.read(cartProvider).lines, isEmpty);
    });

    test('adding a new line appends', () {
      container.read(cartProvider.notifier).add(_line('A'));
      expect(container.read(cartProvider).lines.length, 1);
    });
  });
}
```

#### Template — Flutter widget
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mediwyz_mobile/widgets/my_widget.dart';

void main() {
  testWidgets('renders heading and primary button', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: MyWidget())),
    );
    expect(find.text('Heading'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsOneWidget);
  });

  testWidgets('tapping button triggers handler', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(home: MyWidget(onTap: () => tapped = true)),
    );
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();
    expect(tapped, isTrue);
  });
}
```

#### Template — Playwright E2E
```ts
import { test, expect } from '@playwright/test';

test.describe('Patient booking golden path', () => {
  test('signup → find doctor → book → pay → see confirmation', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('First name').fill('Ada');
    // …
    await expect(page.getByText('Your booking is confirmed')).toBeVisible();
  });
});
```

### 5. Check coverage matrix
For each public method / branch / error, produce a row:
| Method / branch | Happy | Error | Edge |
|---|---|---|---|
| `createThing` | ✓ | ✓ | ✓ |
| `deleteThing` | ✓ | ✗ | ✗ |

Every row should be all-✓ before the skill claims the file "has coverage".

### 6. Run the tests
Always close the loop. Run the freshly-generated suite:
```bash
cd backend && npx jest --testPathPattern=<file>
npx vitest run <file>
cd mobile && flutter test <path>
```
If anything fails, FIX the test (or the code if the test revealed a real bug) before declaring done.

## Anti-patterns to reject
- Asserting implementation details (private fields, call order that doesn't matter)
- Mocking the SUT
- Snapshots for interactive components
- Shared module-level state between tests (always reset in `beforeEach`)
- Over-mocking — if a pure function is under test, don't mock its caller
- Copy-pasting the production string into the test (brittle) — match by `role` / `semantic label`

## Hand-off
Output a diff with:
- The new spec file(s)
- A summary of coverage gained (rows in the matrix above)
- The `npx jest` / `npx vitest` / `flutter test` command that was run + its pass/fail
