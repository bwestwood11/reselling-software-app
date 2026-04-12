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
pnpm clean            # Remove all build artifacts and node_modules
```

### Per-app (run from repo root with --filter or cd into app)
```bash
pnpm --filter api dev        # Fastify API on :3001 (tsx watch)
pnpm --filter web dev        # Next.js on :3000
pnpm --filter mobile dev     # Expo dev server
pnpm --filter mobile android # Expo Android
pnpm --filter mobile ios     # Expo iOS
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
apps/mobile   — Expo / React Native app (tab-based, Expo Router)
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

**Key listing endpoints:** listings routes include publish, delist, and mark-sold actions in addition to standard CRUD.

### Authentication (`packages/auth`)

Better Auth with a Prisma adapter. The server config lives in `packages/auth/src/index.ts` (used by the API). The React client is at `packages/auth/src/client.ts` (used by web/mobile). Session expiry is 30 days; cookie cache TTL is 5 minutes. Supports email/password and Google OAuth.

The `requireAuth` middleware calls `auth.api.getSession()` and attaches the user to `request.user`.

The web app proxies auth at `app/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)`.

Exports from `packages/auth/src/client.ts`: `authClient`, `signIn`, `signOut`, `signUp`, `useSession`, `getSession`.

### Database (`packages/db`)

Prisma with PostgreSQL (Neon). Key models:

- **User / Session / Account / Verification** — managed by Better Auth
- **InventoryItem** — user's physical items; has child `InventoryImage[]` and `InventoryAttribute[]`; `dimensions` stored as JSON, `tags` as String array; prices in cents
- **Listing** — a marketplace listing derived from an `InventoryItem`; tracks `externalId`, `externalUrl`, `status`, `lastSyncAt`, `marketplaceData` (JSON)
- **MarketplaceConnection** — stored OAuth tokens per user per marketplace (unique constraint on `userId + marketplace`)
- **SyncEvent** — audit log of every publish/update/delist/error per listing; type is `SyncEventType` enum

`DATABASE_URL` is used for pooled connections; `DIRECT_URL` for migrations.

**Enums:** `MarketplaceType` (EBAY, FACEBOOK_MARKETPLACE, DEPOP, MERCARI, POSHMARK, ETSY), `InventoryStatus` (DRAFT, ACTIVE, SOLD, ARCHIVED), `Condition` (NEW_WITH_TAGS, NEW_WITHOUT_TAGS, VERY_GOOD, GOOD, SATISFACTORY), `ListingStatus` (DRAFT, PENDING, ACTIVE, SOLD, ENDED, FAILED), `SyncEventType` (PUBLISH, UPDATE, DELIST, SOLD, RELIST, PRICE_UPDATE, STATUS_CHECK, ERROR).

### Marketplace integration (`apps/api/src/services/marketplace/`)

Factory pattern: `MarketplaceFactory.create(marketplace, connection)` returns a concrete adapter extending `BaseMarketplaceAdapter` (abstract: `publish`, `update`, `delist`, `checkStatus`). eBay and Depop have real implementations; Facebook and Mercari are stubs (no public API).

### Web frontend (`apps/web`)

Next.js App Router. All data fetching uses React Query (`@tanstack/react-query`). Forms use React Hook Form + Zod. Shared UI components come from `@repo/ui`; utility functions from `@repo/utils`.

Packages that need transpilation are listed in `next.config.ts` under `transpilePackages`.

**Route groups:**
```
src/app/(auth)/          — login/, register/ pages
src/app/(dashboard)/     — dashboard/, inventory/, inventory/[id]/, inventory/new/,
                           listings/, listings/new/, settings/, settings/marketplaces/, sync/
src/app/api/auth/[...all]/ — Better Auth proxy via toNextJsHandler
```

**Key directories:**
```
src/hooks/       — use-inventory.ts, use-listings.ts (React Query custom hooks)
src/lib/api.ts   — typed API client (inventoryApi, listingsApi, marketplacesApi, dashboardApi, syncApi)
src/providers/   — providers.tsx (QueryClientProvider)
src/components/layout/  — sidebar.tsx
src/components/ui/      — web-local UI components (dialog, dropdown-menu, form, sheet, tabs, textarea, …)
```

Note: `src/components/ui/` contains additional components (Dialog, DropdownMenu, Form, Sheet, Tabs, Textarea) beyond what `@repo/ui` exports. These are web-app-local and not shared.

### Mobile (`apps/mobile`)

Expo Router with tab-based navigation. Four tabs: home (index), inventory, listings, settings. React Query for data fetching. Mobile-specific API client at `src/lib/api.ts`.

```
app/(tabs)/   — _layout.tsx, index.tsx, inventory.tsx, listings.tsx, settings.tsx
```

App metadata: name "ReList", scheme "relist", bundle ID `com.relist.app`. Typed routes enabled via `experiments.typedRoutes`.

### Shared types (`packages/types`)

Exports all domain enums (mirrored from Prisma for use without importing `@repo/db`), API shapes (`PaginatedResponse<T>`, `ApiResponse<T>`, `PaginationQuery`), input types for creating/updating inventory and listings, and `DashboardStats`, `SyncEventSummary`, `MarketplaceCount`, `AuthUser`.

### Shared UI (`packages/ui`)

Exports: `Button`, `Badge`, `Card` (+ sub-components), `Input`, `Label`, `Select` (+ sub-components), `Separator`, and the `cn` classname utility.

### Shared utilities (`packages/utils`)

- **Pagination:** `getPaginationParams`, `buildPaginatedResponse` — used in every paginated API route
- **Currency:** `formatCurrency`, `centsToDecimal`, `decimalToCents` — all prices stored as cents (integers) in the DB
- **Marketplace:** `MARKETPLACE_LABELS`, `getMarketplaceLabel`
- **String:** `slugify`, `truncate`, `generateSku`
- **Date:** `formatRelativeDate`, `startOfMonth`
- **Error:** `getErrorMessage`
- **Validation:** `isValidEmail`, `isValidUrl`

## TypeScript

Strict mode is on everywhere (`strict: true`, `noUncheckedIndexedAccess: true`). API uses the `node` tsconfig; web uses `nextjs`; mobile uses `react-native`. Use `type` imports (`import type { … }`) — the ESLint rule enforces this.

## Prettier

Double quotes, semicolons, trailing commas, 100-char print width. `prettier-plugin-tailwindcss` auto-sorts Tailwind classes.
