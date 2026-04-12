FROM node:20-alpine AS base
RUN corepack enable pnpm

# ── Dependencies stage ────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY config/tsconfig/package.json ./config/tsconfig/

RUN pnpm install --frozen-lockfile

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Generate Prisma client
RUN pnpm --filter @repo/db db:generate

# Build the API
RUN pnpm --filter @repo/api build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable pnpm

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["node", "dist/index.js"]
