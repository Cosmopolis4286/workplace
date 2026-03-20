# ---------- BASE ----------
FROM node:20-alpine AS base

WORKDIR /app

# Habilitar pnpm solo para builds
RUN corepack enable && corepack prepare pnpm@latest --activate

# Variables de entorno base
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV} \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=512"

# ---------- DEPENDENCIAS ----------
FROM base AS deps

# Copiar lockfiles para cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/

# Instalar dependencias con cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# ---------- BUILD ----------
FROM deps AS builder

WORKDIR /app/frontend

# Copiar código fuente
COPY frontend/ ./

# Construir Nuxt (SSR o SSG según config)
RUN NODE_OPTIONS="--max-old-space-size=2048" pnpm run build \
    && rm -rf .nuxt/.cache node_modules/.cache

# ---------- PRODUCCIÓN ----------
FROM node:20-alpine AS production

# Dependencias runtime mínimas
RUN apk add --no-cache dumb-init ca-certificates

WORKDIR /app

# Copiar solo el build optimizado
COPY --from=builder /app/frontend/.output ./.output

# Crear usuario no root
RUN addgroup -S -g 1001 app && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G app app && \
    chown -R app:app /app

USER app

# Healthcheck liviano
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]