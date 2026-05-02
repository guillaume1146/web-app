---
description: Performance rules — DB queries, caching, bundle size, render cost
globs: "{backend,app,components,lib,hooks}/**/*.{ts,tsx}"
---

# Performance

## Database (Prisma)

- **N+1 killer**: never `await` inside a `for` loop over Prisma results. Use `findMany` + `in:` filter, or `groupBy`.
- **Select what you need**: `select: { id, name }` instead of `include` of full nested objects.
- **Index hot filters**: any column used in `where:` for >100 calls/min needs `@@index([col])` in schema.
- **Transactions**: wrap multi-table writes in `prisma.$transaction(async tx => { ... })` to keep them atomic AND short.
- **Pagination**: every list endpoint accepts `?page&limit`, defaults to `limit=20`, max 100.

## Caching

- In-memory caches (like `RolesResolverService`) need a **TTL** + **refresh-on-miss** + **manual invalidation** after admin CRUD.
- HTTP caches: GET endpoints serving public read-only data should set `Cache-Control: public, max-age=60` headers.

## Frontend bundle

- Dynamic imports for heavy/conditional components: `dynamic(() => import('./VideoCallRoom'), { ssr: false })`.
- Tree-shake icon libraries: `import { FaUser } from 'react-icons/fa'` (named), not `import * as Fa`.
- Images: use `next/image` or `cached_network_image` (Flutter) — never raw `<img>` for user content.

## React render cost

- Memoize fetch handlers with `useCallback` so child components don't re-fetch on every render.
- `useMemo` only for objects/arrays passed to children that use referential equality (`React.memo`, `Object.is`).
- Don't memoize trivial values — overhead exceeds benefit.

## Socket.IO

- Join only the rooms you need (`user:{userId}` for notifications, `convo:{id}` for chat). Don't broadcast globally.
- Throttle high-frequency events client-side (typing indicators) to ≤1/sec.

## Anti-patterns

- ❌ `await prisma.x.findMany()` in render path of an SSR page (use route handlers / Server Components)
- ❌ `setInterval` that polls the API every <30s — use Socket.IO instead
- ❌ Loading 50MB seed data in production
- ❌ Storing image binaries in DB — use object storage + URL
