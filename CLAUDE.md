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

Stripe env vars required in `apps/api/.env`:
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_STARTER_PRICE_ID` — recurring price ID for Starter plan ($9.99/mo)
- `STRIPE_PRO_PRICE_ID` — recurring price ID for Pro plan ($24.99/mo)
- `STRIPE_PREMIUM_PRICE_ID` — recurring price ID for Premium plan ($49.99/mo)

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
src/routes/      inventory.ts | listings.ts | marketplaces.ts | dashboard.ts | sync.ts | upload.ts | subscriptions.ts | webhooks.ts
src/services/    inventory.service.ts | listing.service.ts | sync.service.ts | subscription.service.ts | marketplace/
src/middleware/  auth.ts (requireAuth — reads Better Auth session from headers)
src/plugins/     prisma.ts (decorates fastify with fastify.prisma)
src/jobs/        sync.job.ts (node-cron, every 30 min, syncs all active listings)
src/config/      plans.ts (plan definitions: FREE/STARTER/PRO/PREMIUM with Stripe price IDs and credit amounts)
```

**Plugins registered:** Helmet (CSP disabled), CORS (origin validation), Rate-limit (100/min), Prisma, Multipart (for file uploads).

**Auth handler:** All Better Auth routes are proxied at `/api/auth/*` via `toNodeHandler(auth)`.

**Webhook handler:** `POST /api/webhooks/stripe` is registered without `requireAuth` — Stripe signature verification is done inside the route using `STRIPE_WEBHOOK_SECRET`.

**Response shape:** `{ success: true, data?, total?, page?, totalPages? }` — errors use `{ success: false, error: string }`.

**Route summary:**

| File | Endpoints |
|------|-----------|
| `dashboard.ts` | `GET /api/dashboard/stats` |
| `inventory.ts` | CRUD on `/api/inventory` + `PATCH /:id/status` |
| `listings.ts` | CRUD on `/api/listings` + `POST /:id/publish`, `/:id/delist`, `/:id/mark-sold` |
| `marketplaces.ts` | Connections CRUD, eBay policies/categories, OAuth authorize/callback |
| `subscriptions.ts` | `GET /api/subscriptions/current`, `POST /api/subscriptions/checkout`, `POST /api/subscriptions/portal` |
| `sync.ts` | `POST /api/sync/all`, `POST /api/sync/listing/:id`, `GET /api/sync/events` |
| `upload.ts` | `POST /api/upload` — single image to S3 (JPEG/PNG/WebP/GIF, max 10 MB), returns `{ url, key }` |
| `webhooks.ts` | `POST /api/webhooks/stripe` — Stripe event handler (no auth, signature verified) |

**Marketplace routes detail:**
- `GET /api/marketplaces/connections` — list connections with account details and listing counts
- `DELETE /api/marketplaces/connections/:id` — remove connection
- `POST /api/marketplaces/ebay/setup-policies` — opt-in to SELLING_POLICY_MANAGEMENT, create/fetch fulfillment, payment, return policies
- `GET /api/marketplaces/ebay/policies` — fetch existing eBay policies
- `GET /api/marketplaces/ebay/category-suggestions?q=` — eBay category suggestions
- `GET /api/marketplaces/ebay/category-aspects?categoryId=` — required/recommended aspects for a category
- `GET /api/marketplaces/oauth/:marketplace/authorize` — build OAuth authorization URL
- `GET /api/marketplaces/oauth/:marketplace/callback` — OAuth callback (verifies state, exchanges code, stores connection)

**Subscription service (`SubscriptionService`):**
- `getCurrent(userId)` — fetches subscription with credit balance
- `checkCredits(userId)` — asserts user has ≥ 1 credit, throws if not
- `deductCredit(userId, listingId, description)` — deducts 1 credit, creates a `CreditTransaction`
- `refundCredit(userId, listingId, description)` — refunds 1 credit if a publish fails
- `createCheckoutSession(userId, priceId)` — creates a Stripe Checkout session
- `createPortalSession(userId)` — creates a Stripe Customer Portal session
- `handleWebhookEvent(event)` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` to sync subscription state and credit top-ups

### Authentication (`packages/auth`)

Better Auth with a Prisma adapter. The server config lives in `packages/auth/src/index.ts` (used by the API). The React client is at `packages/auth/src/client.ts` (used by web/mobile). Session expiry is 30 days; cookie cache TTL is 5 minutes. Supports email/password and Google OAuth.

The `requireAuth` middleware calls `auth.api.getSession()` and attaches the user to `request.user`.

The web app proxies auth at `app/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)`.

Trusted origins: `localhost:3000`, `127.0.0.1:3000`, `relist://` (mobile scheme), `exp://*` (Expo Go), plus any custom origins from env.

**New user hook:** `databaseHooks.user.create.after` automatically creates a FREE-tier `Subscription` with `FREE_TIER_CREDITS` (= 20) credits for every new user.

Exports from `packages/auth/src/index.ts`: `auth`, `Auth` (type), `Session` (type), `FREE_TIER_CREDITS`.
Exports from `packages/auth/src/client.ts`: `authClient`, `signIn`, `signOut`, `signUp`, `useSession`, `getSession`.

### Database (`packages/db`)

Prisma with PostgreSQL (Neon). Key models:

- **User / Session / Account / Verification** — managed by Better Auth; `User` also has `subscription` and `creditTransactions` relations
- **InventoryItem** — user's physical items; has child `InventoryImage[]` (url, key, isPrimary, sortOrder) and `InventoryAttribute[]`; `dimensions` stored as JSON, `tags` as String array; prices in cents; default condition GOOD, default status DRAFT, default quantity 1
- **Listing** — a marketplace listing derived from an `InventoryItem`; tracks `externalId`, `externalUrl`, `status`, `listedAt`, `soldAt`, `endedAt`, `lastSyncAt`, `syncError`, `marketplaceData` (JSON)
- **MarketplaceConnection** — stored OAuth tokens per user per marketplace; fields: `userId`, `marketplace`, `accessToken`, `refreshToken`, `expiresAt`, `accountId`, `accountName`, `isActive`; unique constraint on `(userId, marketplace)`
- **SyncEvent** — audit log of every publish/update/delist/error per listing; `status` field is a string (`success`/`failed`/`pending`); `data` is JSON
- **Subscription** — one per user; fields: `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `plan` (PlanType), `status` (SubscriptionStatus), `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `credits`; unique on `userId`
- **CreditTransaction** — ledger entry; `amount` is positive (add) or negative (use); linked to `subscriptionId`, `userId`, optional `listingId`

`DATABASE_URL` is used for pooled connections; `DIRECT_URL` for migrations.

**Enums:** `MarketplaceType` (EBAY, FACEBOOK_MARKETPLACE, DEPOP, MERCARI, POSHMARK, ETSY), `InventoryStatus` (DRAFT, ACTIVE, SOLD, ARCHIVED), `Condition` (NEW_WITH_TAGS, NEW_WITHOUT_TAGS, VERY_GOOD, GOOD, SATISFACTORY), `ListingStatus` (DRAFT, PENDING, ACTIVE, SOLD, ENDED, FAILED), `SyncEventType` (PUBLISH, UPDATE, DELIST, SOLD, RELIST, PRICE_UPDATE, STATUS_CHECK, ERROR), `PlanType` (FREE, STARTER, PRO, PREMIUM), `SubscriptionStatus` (ACTIVE, INACTIVE, PAST_DUE, CANCELLED, TRIALING).

Note: `packages/types` mirrors the above enums and additionally includes `WHATNOT` and `GRAILED` in `MarketplaceType` (not yet in the Prisma schema).

### Marketplace integration (`apps/api/src/services/marketplace/`)

Factory pattern: `MarketplaceFactory.create(marketplace, connection)` returns a concrete adapter extending `BaseMarketplaceAdapter` (abstract: `publish`, `update`, `delist`, `checkStatus`). eBay and Depop have real implementations; Facebook and Mercari are stubs (no public API).

`token-refresh.ts` — `refreshConnectionIfNeeded(db, connection)` refreshes the access token when < 5 minutes remain; `refreshEbayConnection` implements eBay OAuth refresh token flow. Called by adapters before making API calls.

eBay adapter maps internal `Condition` values to eBay `ConditionID` (1000 = NEW_WITH_TAGS, 1500 = NEW_WITHOUT_TAGS, 3000 = pre-owned). Uses the XML-based Trading API.

Publishing a listing deducts 1 credit via `SubscriptionService.deductCredit`; if the adapter throws, the credit is automatically refunded.

### Web frontend (`apps/web`)

Next.js App Router. All data fetching uses React Query (`@tanstack/react-query`). Forms use React Hook Form + Zod. Shared UI components come from `@repo/ui`; utility functions from `@repo/utils`.

Packages that need transpilation are listed in `next.config.ts` under `transpilePackages`.

**Route groups:**
```
src/app/(auth)/                          — login/, register/ pages
src/app/(dashboard)/
  dashboard/                             — main dashboard
  dashboard/marketplaces/               — marketplace catalog with API support status
  inventory/                             — inventory list
  inventory/new/                         — create inventory item
  inventory/[id]/                        — view inventory item
  inventory/[id]/edit/                   — edit inventory item (image upload + form)
  listings/                              — listings list
  listings/new/                          — create listing
  marketplaces/                          — marketplace connections management (OAuth flow)
  settings/
  settings/billing/                      — Stripe subscription & credit management
  settings/marketplaces/
  sync/
src/app/api/auth/[...all]/               — Better Auth proxy via toNextJsHandler
src/app/api/ebay/add-item/route.ts       — eBay AddItem XML-RPC endpoint (web-side)
```

**Key directories:**
```
src/hooks/       — use-inventory.ts, use-listings.ts, use-subscription.ts (React Query custom hooks)
src/lib/api.ts   — typed API client (inventoryApi, listingsApi, marketplacesApi, dashboardApi, syncApi, uploadApi, subscriptionApi)
src/lib/ebay/    — eBay client utilities (auth/EbayAuthClient, trading/EbayTradingClient, trading/addItemXml, trading/parseAddItemResponse, types/)
src/providers/   — providers.tsx (QueryClientProvider)
src/components/layout/  — sidebar.tsx
src/components/ui/      — web-local UI components (dialog, dropdown-menu, form, sheet, tabs, textarea, …)
```

`uploadApi.uploadImage(file)` — sends `FormData` to `POST /api/upload`, returns `{ url, key }`.

`subscriptionApi` — wraps `GET /api/subscriptions/current`, `POST /api/subscriptions/checkout`, `POST /api/subscriptions/portal`.

Note: `src/components/ui/` contains additional components (Dialog, DropdownMenu, Form, Sheet, Tabs, Textarea) beyond what `@repo/ui` exports. These are web-app-local and not shared.

### Mobile (`apps/mobile`)

Expo Router with tab-based navigation. Five tabs: home (index), inventory, listings, marketplaces, settings. React Query for data fetching. Mobile-specific API client at `src/lib/api.ts`.

```
app/(auth)/   — login.tsx, register.tsx, oauth-callback.tsx (checks auth state, redirects to tabs or back to login)
app/(tabs)/   — _layout.tsx, index.tsx, inventory.tsx, listings.tsx, marketplaces.tsx, settings.tsx
```

App metadata: name "ReList", scheme "relist", bundle ID `com.relist.app`. Typed routes enabled via `experiments.typedRoutes`.

### Shared types (`packages/types`)

Exports all domain enums (mirrored from Prisma for use without importing `@repo/db`), API shapes (`PaginatedResponse<T>`, `ApiResponse<T>`, `PaginationQuery`), input types for creating/updating inventory and listings (`CreateInventoryItemInput`, `UpdateInventoryItemInput`, `CreateListingInput`, `UpdateListingInput`, `MarketplaceOAuthCallbackInput`), `DashboardStats`, `SyncEventSummary`, `MarketplaceCount`, `AuthUser`, `Dimensions`, and `SubscriptionInfo` (includes plan, status, credits, `monthlyCredits`).

Also exports `PlanType` and `SubscriptionStatus` enums mirroring the Prisma schema.

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
