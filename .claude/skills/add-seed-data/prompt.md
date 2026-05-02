---
description: Add new seed data file with proper idempotent pattern
user-invocable: true
---

# Add Seed Data

## Steps

1. **Check next available number**:
   ```bash
   ls prisma/seeds/ | tail -3
   ```

2. **Create file** at `prisma/seeds/{number}-{name}.seed.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client'

   export async function seed{Name}(prisma: PrismaClient) {
     console.log('  {number}. Seeding {name}...')

     // Use upsert or check-before-create for idempotency
     const existing = await prisma.model.findUnique({ where: { id: 'ID' } })
     if (existing) return

     await prisma.model.create({ data: { ... } })
   }
   ```

3. **Register in `prisma/seed.ts`**:
   - Add import at top
   - Add function call in the main seed sequence

4. **Run**: `npx prisma db seed`

## Rules
- DO NOT remove existing seed files
- Always use next available number
- Be idempotent (safe to run multiple times)
- Use `await prisma.$transaction()` for multi-table operations
