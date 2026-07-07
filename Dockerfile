FROM node:22-slim AS base

# ============================================================
# DEPENDENCIES
# ============================================================
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ============================================================
# BUILD
# ============================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ============================================================
# RUNTIME (adapter-node, non-root)
# ============================================================
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs svelte

COPY --from=builder --chown=svelte:nodejs /app/build ./build
COPY --from=builder --chown=svelte:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json
COPY --from=builder --chown=svelte:nodejs /app/prisma ./prisma

USER svelte
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

# Migrations køres deklarativt ved opstart (deploy-mønster fra huset)
CMD ["sh", "-c", "npx prisma migrate deploy && node build"]
