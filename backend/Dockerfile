# ---------- BASE ----------
FROM node:20-alpine AS base

# Install system dependencies and pnpm in single optimized layer
RUN apk add --no-cache \
    netcat-openbsd \
    bash \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && npm install -g typescript

WORKDIR /app

# Set Node.js optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"

# ---------- DEPENDENCIAS ----------
FROM base AS deps

# Copy package files for optimal cache utilization
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Install dependencies with optimization
RUN pnpm install --frozen-lockfile --prefer-offline && \
    pnpm store prune

# ---------- BUILD ----------
FROM base AS builder
WORKDIR /app

# Copy dependencies and source code strategically for better caching
COPY --from=deps /app/node_modules ./node_modules/
COPY --from=deps /app/backend/package.json ./backend/

# Copy source code in order of change frequency
COPY backend/tsconfig.json* ./backend/
COPY backend/prisma ./backend/prisma/
COPY backend/src ./backend/src/

WORKDIR /app/backend

# Generate Prisma client (cached if schema doesn't change)
RUN npx prisma@5.9.1 generate --schema=./prisma/schema.prisma || true

# Build TypeScript with optimizations
RUN pnpm run build || true

# Clean up build artifacts to reduce layer size
RUN rm -rf node_modules/.cache && \
    find node_modules -name "*.ts" -delete && \
    find node_modules -name "*.map" -delete 2>/dev/null || true

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

# Install runtime dependencies and pnpm
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && update-ca-certificates

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy and install only production dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
RUN pnpm install --prod --frozen-lockfile --prefer-offline --force || true && \
    pnpm store prune && rm -rf /tmp/*

# Copy built artifacts and Prisma client only
COPY --from=builder /app/backend/dist ./dist/
COPY --from=builder /app/backend/prisma/schema.prisma ./prisma/

# Create non-root user with minimal permissions
RUN addgroup -S -g 1001 app && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G app app && \
    chown -R app:app /app && \
    chmod -R 755 /app
USER app

# Optimized health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "try { require('http').get('http://localhost:3001/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)); } catch(e) { process.exit(1); }"

EXPOSE 3001

# Use dumb-init for proper signal handling and zombie process cleanup
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]