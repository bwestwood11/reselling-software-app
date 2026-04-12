# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev              # Start all apps in parallel (Turbo)
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm format           # Prettier format all TS/TSX/JSON/MD files
```

### Per-app (run from repo root with --filter or cd into app)
```bash
pnpm --filter api dev        # Fastify API on :3001 (tsx watch)
pnpm --filter web dev        # Next.js on :3000
pnpm --filter mobile dev     # Expo dev server
```

### Database (runs against packages/db, routed through Turbo)
```bash
pnpm db:generate    # Regenerate Prisma client after schema changes
pnpm db:push        # Push schema to DB (no migration file — dev only)
pnpm db:migrate     # Create and apply a named migration
pnpm db:studio      # Open Prisma Studio
pnpm --filter @repo/db db:seed  # Seed the database
```

### Environment setup
Each app needs its own `.env` file. Copy `apps/api/.env.example` → `apps/api/.env`. The web app needs `apps/web/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001`.

## Architecture

### Monorepo layout
```
apps/api      — Fastify 5 REST API (Node.js, TypeScript)
apps/web      — Next.js 15 (App Router) dashboard
apps/mobile   — Expo / React Native app (early stage)
packages/auth — Better Auth server config + React client
packages/db   — Prisma schema + generated client (@repo/db)
packages/types — Shared TypeScript types (MarketplaceType, enums, API shapes)
packages/ui   — Shared Radix UI + Tailwind components (Button, Card, Input…)
packages/utils — Shared utilities (pagination, currency, slugify, dates…)
config/tsconfig — Shared TS configs (base, node, nextjs, react-native)
config/eslint  — Shared ESLint config
```

Internal packages use the `@repo/` prefix. Turbo orchestrates all tasks across the workspace.

### API (`apps/api`)

**Entry:** `src/index.ts` → `src/app.ts` (Fastify instance, plugin registration, route mounting)

**Route → Service pattern:** Each route file instantiates a service class with `fastify.prisma`, applies `requireAuth` as a `preHandler`, then delegates to the service. Services own all business logic and DB queries.

```
src/routes/      inventory.ts | listings.ts | marketplaces.ts | dashboard.ts | sync.ts
src/services/    inventory.service.ts | listing.service.ts | sync.service.ts | marketplace/
src/middleware/  auth.ts (requireAuth — reads Better Auth session from headers)
src/plugins/     prisma.ts (decorates fastify with fastify.prisma)
src/jobs/        sync.job.ts (node-cron, every 30 min, syncs all active listings)
```

**Auth handler:** All Better Auth routes are proxied at `POST /api/auth/*` via `toNodeHandler(auth)`.

**Response shape:** `{ success: true, data?, total?, page?, totalPages? }` — errors use `{ success: false, error: string }`.

### Authentication (`packages/auth`)

Better Auth with a Prisma adapter. The server config lives in `packages/auth/src/index.ts` (used by the API). The React client is at `packages/auth/src/client.ts` (used by web/mobile). Session expiry is 30 days; cookie cache TTL is 5 minutes. Supports email/password and Google OAuth.

The `requireAuth` middleware calls `auth.api.getSession()` and attaches the user to `request.user`.

### Database (`packages/db`)

Prisma with PostgreSQL (Neon). Key models:

- **User / Session / Account / Verification** — managed by Better Auth
- **InventoryItem** — user's physical items; has child `InventoryImage[]` and `InventoryAttribute[]`
- **Listing** — a marketplace listing derived from an `InventoryItem`; tracks `externalId`, `status`, `lastSyncAt`
- **MarketplaceConnection** — stored OAuth tokens per user per marketplace (unique constraint on `userId + marketplace`)
- **SyncEvent** — audit log of every publish/update/delist/error per listing

`DATABASE_URL` is used for pooled connections; `DIRECT_URL` for migrations.

### Marketplace integration (`apps/api/src/services/marketplace/`)

Factory pattern: `MarketplaceFactory.create(marketplace, connection)` returns a concrete adapter extending `BaseMarketplaceAdapter` (abstract: `publish`, `update`, `delist`, `checkStatus`). eBay and Depop have real implementations; Facebook and Mercari are stubs (no public API).

### Web frontend (`apps/web`)

Next.js App Router. All data fetching uses React Query (`@tanstack/react-query`). Forms use React Hook Form + Zod. Shared UI components come from `@repo/ui`; utility functions from `@repo/utils`.

Packages that need transpilation are listed in `next.config.ts` under `transpilePackages`.

### Shared utilities (`packages/utils`)

`getPaginationParams` / `buildPaginatedResponse` are used in every paginated API route. `formatCurrency` / `centsToDecimal` / `decimalToCents` handle money. All prices are stored as cents (integers) in the DB.

## TypeScript

Strict mode is on everywhere (`strict: true`, `noUncheckedIndexedAccess: true`). API uses the `node` tsconfig; web uses `nextjs`; mobile uses `react-native`. Use `type` imports (`import type { … }`) — the ESLint rule enforces this.

## Prettier

Double quotes, semicolons, trailing commas, 100-char print width. `prettier-plugin-tailwindcss` auto-sorts Tailwind classes.
