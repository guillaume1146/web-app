# ─── Stage 1: Install dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --install-strategy=nested

# ─── Stage 2: Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy backend deps
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./

# Copy Prisma schema from root (shared with Next.js)
COPY prisma/ ../prisma/

# Generate Prisma client into backend's node_modules
RUN npx prisma generate --schema=../prisma/schema.prisma

# Build NestJS
ENV NODE_ENV=production
RUN npx nest build

# ─── Stage 3: Production runner ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy compiled output + production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy Prisma schema + generated client (needed at runtime)
COPY --from=builder /app/../prisma ../prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001
ENV API_PORT=3001

CMD ["node", "dist/main.js"]
