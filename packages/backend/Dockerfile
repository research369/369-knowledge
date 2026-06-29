FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Copy backend source
COPY packages/backend/ ./packages/backend/

# Build TypeScript
RUN cd packages/backend && pnpm build

# ─── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

# Copy backend package.json
COPY packages/backend/package.json ./package.json

# Install production dependencies
RUN pnpm install --prod --no-frozen-lockfile

# Copy built artifacts
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/drizzle ./drizzle

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
