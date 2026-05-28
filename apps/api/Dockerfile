FROM node:20-slim AS base
RUN corepack enable pnpm

# ── Dependencies stage ────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-browsers

# Copy workspace manifests for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY config/tsconfig/package.json ./config/tsconfig/

RUN pnpm install --frozen-lockfile

# Download Chromium into a known path so we can copy it to the runner stage
RUN pnpm --filter @repo/api exec playwright install chromium

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY . .

# Generate Prisma client
RUN pnpm --filter @repo/db db:generate

# Build the API
RUN pnpm --filter @repo/api build

# ── Production stage ──────────────────────────────────────────────────────────
# Workspace packages export TypeScript source directly, so we ship source and
# run with tsx rather than shipping the tsc output.
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-browsers

# Chromium + openssl system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

# Root pnpm virtual store
COPY --from=builder /app/node_modules ./node_modules

# Per-package node_modules (pnpm symlinks for each workspace member)
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=builder /app/packages/utils/node_modules ./packages/utils/node_modules

# API source + config
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json

# Workspace package sources (exported as TypeScript — must be present at runtime)
COPY --from=builder /app/packages/auth/src ./packages/auth/src
COPY --from=builder /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=builder /app/packages/db/src ./packages/db/src
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/types/src ./packages/types/src
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/src ./packages/utils/src
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json

COPY --from=deps /app/playwright-browsers ./playwright-browsers

EXPOSE 3001

CMD ["apps/api/node_modules/.bin/tsx", "apps/api/src/index.ts"]
