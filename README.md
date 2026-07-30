# Ultrahuman

An AI-powered productivity platform that unifies your Gmail and Google Calendar behind a single intelligent interface. Built as a full-stack Turborepo monorepo with Next.js, Express, tRPC, Drizzle ORM, and PostgreSQL.

> **Live:** [ultrahuman.co.in](https://ultrahuman.co.in)

---

## What It Does

Ultrahuman replaces the context-switching between your inbox and calendar with a unified experience augmented by an AI agent. Instead of manually triaging emails, scheduling meetings, and hunting through threads, you interact with a conversational orchestrator that understands your Gmail and Google Calendar context.

**Core capabilities:**

| Feature | What you get |
|---|---|
| **Unified Inbox** | Full Gmail client in the browser — folders (Inbox, Starred, Sent, Archive, Trash), thread list, email viewer, compose, reply, search, and keyboard shortcuts (j/k/e/s/c). Full draft management (create, edit, send, delete). AI-powered priority classification surfaces what matters. |
| **Calendar** | Day, week, month, and year views with event creation, Google Meet links, RSVP responses (Accept / Decline / Tentative), and companion email invites. All times use Asia/Kolkata timezone. |
| **AI Orchestrator** | A chat-based agent (powered by OpenAI function calling + Corsair MCP tools) that reads emails, drafts replies, creates calendar events, and searches your inbox using natural language. Supports multi-turn follow-ups and email search/list workflows. |
| **Realtime Updates** | Gmail and Calendar screens update live via Server-Sent Events (SSE) when Corsair pushes webhook notifications. No manual refresh. |
| **Payments** | Subscription billing via Dodo Payments (Free tier + Pro tier, monthly and annual plans, INR pricing). |

**Free vs Pro:**

| | Free | Pro |
|---|---|---|
| Gmail & Calendar viewing | Unlimited | Unlimited |
| AI agent requests | 100/day | 100/day |
| AI token budget | 20k tokens/day | 20k tokens/day |
| Priority classification | -- | Included |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Caddy (TLS)                         │
│                  ports 80 / 443                         │
├────────────────────┬────────────────────────────────────┤
│   /trpc /api       │         everything else            │
│   /webhooks        │                                   │
│   /events /docs    │                                   │
│         │          │                │                   │
│    ┌────▼─────┐    │         ┌──────▼──────┐            │
│    │ API:8000 │    │         │  Web:3000   │            │
│    │ Express  │    │         │  Next.js 16 │            │
│    │ tRPC v11 │    │         │  React 19   │            │
│    └────┬─────┘    │         └──────┬──────┘            │
│         │          │                │                   │
│    ┌────▼──────────▼────────────────▼──────┐            │
│    │           PostgreSQL 15               │            │
│    └───────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

**Monorepo layout** managed by Turborepo + pnpm workspaces:

```
apps/
  api/              Express server (port 8000)
  web/              Next.js frontend (port 3000)

packages/
  trpc/             Shared tRPC router, types, client helpers
  services/         Business logic (AI agent, Corsair integrations, payments)
  database/         Drizzle ORM schema, migrations, db client
  auth/             Better Auth configuration (email/password + Google OAuth)
  logger/           Winston logger with correlation IDs
  utils/            Sanitization utilities for Gmail/Calendar data
  eslint-config/    Shared ESLint config
  typescript-config/ Shared tsconfig bases
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | [Turborepo](https://turborepo.com) + pnpm 9 workspaces |
| Frontend | [Next.js 16](https://nextjs.org) (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui + Radix + [next-themes](https://github.com/pacocoursey/next-themes) + TanStack Query |
| Backend | Express 5 + [tRPC v11](https://trpc.io) + OpenAPI (via trpc-to-openapi) |
| Database | PostgreSQL 15 + [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [Better Auth](https://www.better-auth.com/) (email/password + Google OAuth 2.0) |
| AI | OpenAI (GPT-4o-mini, GPT-5-mini) with function calling + Corsair MCP tools |
| Integrations | Corsair (Gmail + Google Calendar connectors) |
| Payments | [Dodo Payments](https://dodopayments.com/) (monthly/annual subscriptions) |
| Email | [Resend](https://resend.com/) (verification emails) |
| Logger | Winston with AsyncLocalStorage correlation IDs |
| Deployment | Docker Compose on VPS + Caddy reverse proxy with auto-TLS |
| CI/CD | GitHub Actions (build, push to GHCR, deploy via SCP) |

---

## Getting Started

### Prerequisites

- Node.js >= 18
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

This copies `.env.example` → `.env` and symlinks it into every app/package directory. Then fill in your values in `.env` (see [Environment Variables](#environment-variables) below).

**Important:** Add `DATABASE_URL` to your `.env` for local development:

```sh
DATABASE_URL=postgresql://souravkumar:souravkumar178@localhost:5433/ultrahuman
```

This matches the credentials in `docker-compose.yml` (Postgres exposed on port **5433**).

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

## Project Structure Deep Dive

### Database Schema

The PostgreSQL database has 11 tables across 4 domains:

**Auth (Better Auth):**
- `user` -- id, name, email, email_verified, image, subscription_tier (free/pro)
- `session` -- session tokens with expiry, linked to user
- `account` -- OAuth tokens (access/refresh/id tokens, scopes)
- `verification` -- email verification tokens

**Chat:**
- `chat_messages` -- AI agent conversation history (role, content, tools_used as JSONB)
- `agent_token_usage` -- daily token budget tracking per user (prompt/completion/total tokens)

**Payments:**
- `payments` -- Dodo Payments transactions (checkout session ID, payment ID, subscription ID, amount in paise, status)

**Corsair (Gmail/Calendar):**
- `corsair_integrations` -- integration configs with encrypted data keys
- `corsair_accounts` -- per-tenant OAuth connections
- `corsair_entities` -- cached Gmail/Calendar data (email threads, events)
- `corsair_events` -- webhook event log

### tRPC API

6 routers with 30+ procedures, all accessible via tRPC (`/trpc`) or REST (`/api`):

| Router | Key Procedures |
|---|---|
| `health` | `getHealth` |
| `auth` | `getSession`, `me` |
| `gmail` | `listThreads`, `getThread`, `searchEmails`, `sendEmail`, `createDraft`, `listDrafts`, `getDraft`, `updateDraft`, `deleteDraft`, `sendDraft`, `archiveThread`, `markAsRead`, `starThread`, `trashThread`, `untrashThread`, `deleteThreadPermanently`, `getAuthUrl`, `getConnectionStatus` |
| `calendar` | `listEvents`, `getEvent`, `createEvent`, `createInvite`, `updateEvent`, `updateRSVP`, `deleteEvent`, `getAuthUrl`, `getConnectionStatus` |
| `agent` | `chat`, `getHistory`, `clearHistory`, `updateMessage` |
| `payment` | `createCheckoutOrder`, `getUserBillingInfo` |

**Procedure middleware types:**
- `publicProcedure` -- no auth required
- `protectedProcedure` -- requires valid session
- `tenantProcedure` -- requires session + tenant isolation (user can only access their own data)

### AI Agent

The agent is an OpenAI function-calling loop that uses Corsair MCP tools to interact with Gmail and Calendar:

1. **Scope validation** -- blocks out-of-scope requests (image generation, code help, general writing)
2. **Model routing** -- selects GPT model based on task type (email, calendar, planning, search)
3. **Tool calling** -- builds Corsair tool definitions, converts Zod schemas to JSON Schema
4. **VM sandbox** -- executes `run_script` in `vm.runInNewContext` with 4s timeout
5. **Budget enforcement** -- daily token limit (20k) and request limit (100)
6. **Chat history** -- maintains conversation context, auto-prunes messages older than 7 days

**Security:** AST-based script validation blocks dangerous patterns (function declarations, dynamic property access, 20+ dangerous identifiers like `process`, `require`, `eval`, `fs`).

### SSE Realtime

```
Corsair webhook -> POST /webhooks/corsair -> SSE broker -> GET /events/corsair -> query invalidation
```

- Max 10 connections per tenant
- 25-second heartbeat
- 60-second stale connection cleanup
- Browser hook (`use-server-events.ts`) patches React Query cache in real-time

---

## Useful Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Lint all packages |
| `pnpm check-types` | TypeScript type-check across the monorepo |
| `pnpm db:generate` | Generate Drizzle migration files from schema |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:studio` | Open Drizzle Studio for the database |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Run Vitest test suite |

---

## API Documentation

When the API server is running:

- **OpenAPI JSON:** http://localhost:8000/openapi.json
- **Scalar API Reference:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

---

## Realtime Corsair Webhooks (Development)

1. Start the API on port `8000` and web app on port `3000`.
2. Run `ngrok http 8000`.
3. Configure the Corsair webhook URL:

```
https://<your-ngrok-host>/webhooks/corsair?tenantId=<better-auth-user-id>
```

The `tenantId` must be the signed-in Better Auth user id. The browser does not pass this id to the SSE stream; `/events/corsair` derives the tenant from the authenticated session cookie.

---

## Environment Variables

See [`.env.example`](.env.example) for a template with inline comments. Run `bash setup.sh` to copy it to `.env` and symlink into all apps/packages.

**Required:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (local: `postgresql://souravkumar:souravkumar178@localhost:5433/ultrahuman`) |
| `BETTER_AUTH_SECRET` | Session signing secret (32+ chars; generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Auth server URL (`http://localhost:8000` locally, `https://ultrahuman.co.in` in prod) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (Better Auth social login) |
| `CORSAIR_KEK` | Encryption key for Corsair integrations (generate with `openssl rand -hex 32`) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth (Gmail/Calendar access; falls back to `GOOGLE_CLIENT_*` if unset) |
| `GOOGLE_OAUTH_REDIRECT_URI` | OAuth callback URL (`http://localhost:8000/corsair/callback` locally) |
| `OPENAI_API_KEY` | OpenAI API key for AI agent |
| `RESEND_API_KEY` | Email verification via Resend |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Dodo Payments webhook signing secret |
| `DODO_PAYMENTS_MONTHLY_PRODUCT_ID` | Monthly subscription product ID |
| `DODO_PAYMENTS_ANNUAL_PRODUCT_ID` | Annual subscription product ID |

**Optional:**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `BASE_URL` | `http://localhost:8000` | Public API base URL |
| `WEB_URL` | `http://localhost:3000` | Public web app URL |
| `EMAIL_MODEL` | `gpt-5-mini` | LLM model for email tasks |
| `PLANNER_MODEL` | `gpt-4o-mini` | LLM model for planning |
| `CALENDAR_MODEL` | `gpt-4o-mini` | LLM model for calendar |
| `SEARCH_MODEL` | `gpt-4o-mini` | LLM model for search |
| `NEXT_PUBLIC_API_URL` | *(empty — uses Next.js proxy)* | Client-side API URL |
| `DOMAIN_NAME` | `localhost` | Domain for Caddy |
| `DODO_PAYMENTS_ENVIRONMENT` | auto-detected | Force `test_mode` or `live_mode` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | see `.env.example` | Used by production Docker Compose to build `DATABASE_URL` |

---

## Dodo Payments Configuration

1. **Dashboard Setup:** Go to your Dodo Payments Dashboard, switch to Live Mode. Generate your API Key under Developer > API Keys and set it as `DODO_PAYMENTS_API_KEY`.

2. **Webhook Endpoint Setup:** Go to Developer > Webhooks, add endpoint `https://your-domain.com/webhooks/dodo`. Subscribe to these events:
   - `payment.succeeded`
   - `subscription.active`
   - `subscription.renewed`

3. **Product Configuration:** Create Monthly and Annual subscription plans. Set the product/billing IDs as `DODO_PAYMENTS_MONTHLY_PRODUCT_ID` and `DODO_PAYMENTS_ANNUAL_PRODUCT_ID`.

---

## Production Deployment

The app deploys to a VPS via Docker Compose with 4 services:

| Service | Image | Replicas |
|---|---|---|
| `postgresdb` | `postgres:15` | 1 |
| `api` | `ghcr.io/.../ultrahuman-api:latest` | 2 |
| `web` | `ghcr.io/.../ultrahuman-web:latest` | 2 |
| `caddy` | `caddy:2-alpine` | 1 |

**CI/CD pipeline** (GitHub Actions on push to `main`):
1. Build API and Web Docker images (multi-stage: base -> builder -> installer -> runner)
2. Push to GitHub Container Registry with `:latest` and `:sha` tags
3. SCP compose files to VPS, pull new images, restart containers, prune old images

Caddy handles TLS termination, routing (`/trpc/*`, `/api/*`, `/events/*`, `/webhooks/*` -> API; everything else -> Web), and gzip/zstd compression.

---

## Web App Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login`, `/signup` | Authentication |
| `/inbox` | Unified Gmail inbox |
| `/calendar` | Calendar (day / week / month / year views) |
| `/chat` | AI orchestrator |
| `/settings` | Account, integrations, billing |
| `/pricing` | Subscription plans |
| `/terms`, `/privacy`, `/cookies`, `/data-deletion` | Legal pages |

The web app proxies `/trpc`, `/events/corsair`, and `/api/auth` to the API server in development.

---

## Project Notes

- All workspace packages use TypeScript source directly (no build step needed in dev thanks to `tsx`)
- The `packages/trpc` package exposes `@repo/trpc/server` and `@repo/trpc/client` sub-path exports
- The API production build uses `tsup` with `noExternal: [/^@repo\//]` to bundle all local packages
- The `setup.sh` script symlinks the root `.env` into every app/package directory
- Theme switching (light / dark / system) is handled by `next-themes` across all pages
- A Cursor-inspired design system is documented in `DESIGN.md`

---

## License

Private project. All rights reserved.
