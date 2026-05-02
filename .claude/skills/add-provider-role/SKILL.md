---
description: End-to-end guide to add a new dynamic provider role (e.g., Audiologist, Psychologist) without touching code
---

# Add a Provider Role

The MediWyz dynamic-roles principle means **no code changes are needed** to add a new provider role — only DB inserts. This skill walks through the safe sequence.

## When to use

The user wants to add a new role like "Audiologist", "Psychologist", or "Dietitian" that should:
- Appear in patient search
- Allow practitioners to register and manage inventory + workflows + bookings
- Be selectable in regional admin role config

## Steps

### 1. Insert ProviderRole row

Either via Regional Admin UI (`/regional/role-config`) or seed file:

```ts
await prisma.providerRole.create({
  data: {
    code: 'AUDIOLOGIST',                  // UPPER_CASE
    label: 'Audiologists',                 // plural
    singularLabel: 'Audiologist',
    slug: 'audiologists',                  // URL slug
    icon: 'FaAssistiveListeningSystems',  // react-icons name
    color: '#0C6780',
    description: 'Hearing health specialist',
    cookieValue: 'audiologist',           // login cookie value
    urlPrefix: '/audiologist',
    searchEnabled: true,
    bookingEnabled: true,
    inventoryEnabled: true,
    isProvider: true,
    isActive: true,
    displayOrder: 50,
    defaultBookingFee: 800,
    skipWalletCheck: false,
    requiredContentType: null,             // 'lab_result' / 'prescription' / etc. or null
  },
});
```

### 2. (Optional) Add specialties

```ts
await prisma.providerSpecialty.createMany({ data: [
  { name: 'Pediatric Audiology', providerType: 'AUDIOLOGIST', isActive: true },
  { name: 'Hearing Aid Fitting', providerType: 'AUDIOLOGIST', isActive: true },
]});
```

### 3. Refresh resolver cache

`RolesResolverService` refreshes every 5 min. To pick up immediately:
```bash
curl -X POST http://localhost:3001/api/admin/cache/roles/refresh
```
(or restart the backend dev process)

### 4. Verify

- `GET /api/roles` → new role appears
- `/signup` → role appears in chooser (only if `searchEnabled: true`)
- `/search/audiologists` → patient search works (Next.js dynamic route)
- `/provider/audiologist/feed` → dashboard works (Next.js dynamic route)

## DO NOT

- ❌ Create a new folder `app/audiologist/` — use the dynamic `/provider/[slug]/` tree
- ❌ Add a new profile table — new roles use `ServiceBooking` + `User` fields only
- ❌ Add `AUDIOLOGIST` to the legacy `userTypeToProfileRelation` map — it's for legacy roles only
- ❌ Hardcode role checks anywhere in business logic
