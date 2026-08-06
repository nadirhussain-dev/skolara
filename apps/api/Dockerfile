# Multi-stage production build for the Skolara API (NestJS), built from the
# monorepo root as build context:
#   docker build -f apps/api/Dockerfile -t skolara-api .
#
# Uses `turbo prune` to extract only what @skolara/api actually depends on
# (its own source plus @skolara/types and @skolara/utils) into a minimal
# workspace, so the final image doesn't carry the whole monorepo.

FROM node:22-alpine AS base
RUN corepack enable

# --- Prune the monorepo down to what @skolara/api needs ---------------------
FROM base AS pruner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN npx turbo prune @skolara/api --docker

# --- Install deps + build -----------------------------------------------
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
# Explicit, defensive step — don't rely solely on @prisma/client's postinstall
# hook to have generated the client during `pnpm install` above.
RUN pnpm --filter @skolara/api exec prisma generate
RUN pnpm turbo run build --filter=@skolara/api

# --- Runtime image -----------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma's query engine needs OpenSSL present at runtime to detect the right
# libssl variant — without it, it silently mismatches against what was
# resolved during `prisma generate` in the builder stage and refuses to start.
RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=builder /app .
USER nestjs

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
