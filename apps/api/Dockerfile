FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@repo/api --docker

FROM base AS installer
WORKDIR /app

# First, copy package.json files for installation caching
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Next, copy the full source and build
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Generate DB types and build the api bundle
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy pnpm db:generate
RUN pnpm build --filter=@repo/api...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built workspace including node_modules
COPY --from=installer /app .

EXPOSE 8000
# Run migrations on startup, then boot the server
CMD ["sh", "-c", "pnpm db:migrate && node apps/api/dist/index.js"]
