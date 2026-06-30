# Build-Context: Repo-Root (Railway dockerfilePath = packages/backend/Dockerfile)
# ---- Builder stage ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install all workspace deps
RUN pnpm install --no-frozen-lockfile

# Copy backend source + drizzle migrations
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/drizzle.config.ts ./packages/backend/
COPY packages/backend/drizzle ./packages/backend/drizzle

# Build TypeScript
RUN cd packages/backend && pnpm build

# ---- Production stage ----
FROM node:22-alpine
WORKDIR /app/packages/backend

RUN npm install -g pnpm@9

COPY packages/backend/package.json ./
RUN pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/drizzle ./drizzle

# Railway setzt PORT dynamisch — kein fester Port im Healthcheck
# start-period=180s: Migrations brauchen Zeit beim ersten Start
HEALTHCHECK --interval=30s --timeout=15s --start-period=180s --retries=5 \
  CMD wget -qO- http://localhost:${PORT:-4001}/health || exit 1

CMD ["node", "dist/index.js"]
