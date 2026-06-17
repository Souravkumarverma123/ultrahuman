# Ultrahuman

A full-stack monorepo for the **Ultrahuman** application — built with Turborepo, tRPC, Next.js, Express, Drizzle ORM, and PostgreSQL.

---

## Stack

| Layer    | Technology                                                            |
| -------- | --------------------------------------------------------------------- |
| Monorepo | [Turborepo](https://turborepo.com) + pnpm workspaces                  |
| Frontend | [Next.js 16](https://nextjs.org) + Tailwind CSS + shadcn/ui           |
| Backend  | Express + [tRPC v11](https://trpc.io) + OpenAPI (via trpc-to-openapi) |
| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)                  |
| Auth     | Google OAuth 2.0                                                      |
| Logger   | Winston                                                               |

---

## Apps and Packages

```
apps/
  api/          Express server — tRPC + OpenAPI endpoints (port 8000)
  web/          Next.js frontend (port 3000)

packages/
  trpc/         Shared tRPC router, types, and client helpers
  services/     Business logic (UserService, Google OAuth)
  database/     Drizzle ORM schema, migrations, and db client
  logger/       Winston logger with env-aware levels
  eslint-config/    Shared ESLint config
  typescript-config/ Shared tsconfig bases
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm 9
- Docker (for PostgreSQL)

### 1. Clone and install

```sh
git clone <repo-url>
cd ultrahuman
pnpm install
```

### 2. Set up environment variables

```sh
bash setup.sh
```

This copies `.env.example` → `.env` and symlinks it into every app/package directory.
Then fill in your values in `.env` (see `.env.example` for all required variables).

### 3. Start the database

```sh
docker compose up -d
```

### 4. Run migrations

```sh
pnpm db:generate
pnpm db:migrate
```

### 5. Start development servers

```sh
pnpm dev
```

This starts both `apps/api` (port **8000**) and `apps/web` (port **3000**) concurrently via Turborepo.

---

## Useful Commands

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | Start all apps in dev mode                   |
| `pnpm build`       | Build all apps for production                |
| `pnpm lint`        | Lint all packages                            |
| `pnpm check-types` | TypeScript type-check across the monorepo    |
| `pnpm db:generate` | Generate Drizzle migration files from schema |
| `pnpm db:migrate`  | Apply pending migrations to the database     |
| `pnpm format`      | Format all files with Prettier               |

---

## API Docs

When the API server is running, visit:

- **OpenAPI JSON**: http://localhost:8000/openapi.json
- **Scalar API Reference**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

## Realtime Corsair Webhooks

The app updates Gmail and Calendar screens in realtime through this local development flow:

```text
Corsair webhook -> /webhooks/corsair -> SSE broker -> /events/corsair -> query invalidation
```

For development:

1. Start the API on port `8000` and web app on port `3000`.
2. Run `ngrok http 8000`.
3. Configure the Corsair/provider webhook URL as:

```text
https://<your-ngrok-host>/webhooks/corsair?tenantId=<better-auth-user-id>
```

The `tenantId` must be the signed-in Better Auth user id because Corsair is running in multi-tenant mode. The browser does not pass this id to the SSE stream; `/events/corsair` derives the tenant from the authenticated session cookie.

---

## Environment Variables

See [`.env.example`](.env.example) for a full list with descriptions.

Key variables:

| Variable                           | Required | Default                 |
| ---------------------------------- | -------- | ----------------------- |
| `DATABASE_URL`                     | ✅       | —                       |
| `GOOGLE_OAUTH_CLIENT_ID`           | ✅       | —                       |
| `GOOGLE_OAUTH_CLIENT_SECRET`       | ✅       | —                       |
| `GOOGLE_OAUTH_REDIRECT_URI`        | ✅       | —                       |
| `PORT`                             | ❌       | `8000`                  |
| `NODE_ENV`                         | ❌       | `development`           |
| `BASE_URL`                         | ❌       | `http://localhost:8000` |
| `NEXT_PUBLIC_API_URL`              | ❌       | `/trpc` (proxy)         |
| `DODO_PAYMENTS_API_KEY`            | ✅       | —                       |
| `DODO_PAYMENTS_ENVIRONMENT`        | ❌       | `live_mode` (prod)      |
| `DODO_PAYMENTS_WEBHOOK_KEY`        | ✅       | —                       |
| `DODO_PAYMENTS_MONTHLY_PRODUCT_ID` | ✅       | —                       |
| `DODO_PAYMENTS_ANNUAL_PRODUCT_ID`  | ✅       | —                       |

---

## Dodo Payments Configuration

To handle payments and automatic user promotion to the **Pro** tier:

1. **Dashboard Setup**: 
   - Go to your Dodo Payments Dashboard and switch to **Live Mode**.
   - Generate your API Key under **Developer > API Keys** and set it as `DODO_PAYMENTS_API_KEY`.
   
2. **Webhook Endpoint Setup**:
   - Go to **Developer > Webhooks** and click **Add endpoint**.
   - Set the URL to `https://your-domain.com/webhooks/dodo`.
   - Under **Subscribed events**, you must select these three events:
     - `payment.succeeded`
     - `subscription.active`
     - `subscription.renewed`
   - Copy the revealed **Signing Secret** and set it as `DODO_PAYMENTS_WEBHOOK_KEY`.

3. **Product Configuration**:
   - Create your Monthly and Annual subscription plans in Dodo Payments storefront.
   - Set the respective product/billing IDs as `DODO_PAYMENTS_MONTHLY_PRODUCT_ID` and `DODO_PAYMENTS_ANNUAL_PRODUCT_ID`.

---

## Project Structure Notes

- All workspace packages use TypeScript source directly (no build step needed in dev thanks to `tsx`)
- The `packages/trpc` package exposes `@repo/trpc/server` and `@repo/trpc/client` sub-path exports
- The API production build uses `tsup` with `noExternal: [/^@repo\//]` to bundle all local packages
