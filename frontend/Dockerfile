# Multi-stage optimized build for Nuxt 3 frontend
FROM node:20-alpine AS base

# Install pnpm and set up optimized environment
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Environment variables for Nuxt 3 optimization
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=256 --max-old-space-size=256"

# ---------- DEPENDENCIES ----------
FROM base AS deps

# Copy package files for optimal cache utilization
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/

# Install dependencies with optimization
RUN pnpm install --frozen-lockfile --prefer-offline && pnpm store prune

# ---------- BUILD ----------
FROM deps AS builder

WORKDIR /app/frontend

# Copy source code
COPY frontend/nuxt.config.ts* ./
COPY frontend/tsconfig.json* ./
COPY frontend/components ./components/
COPY frontend/layouts ./layouts/
COPY frontend/pages ./pages/
COPY frontend/plugins ./plugins/
COPY frontend/middleware ./middleware/
COPY frontend/composables ./composables/
COPY frontend/assets ./assets/
COPY frontend/public ./public/

# Build with optimizations and cleanup
RUN pnpm run build \
    && rm -rf .nuxt/.cache \
    && rm -rf node_modules/.cache

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

# Install runtime dependencies and pnpm
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    wget \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && update-ca-certificates

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=256"

# Copy built application only
COPY --from=builder /app/frontend/.output ./.output

# Create non-root user with minimal permissions
RUN addgroup -S -g 1001 app && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G app app && \
    chown -R app:app /app && \
    chmod -R 755 /app
USER app

# Optimized health check for Nuxt 3
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

# Use dumb-init for proper signal handling and zombie process cleanup
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]