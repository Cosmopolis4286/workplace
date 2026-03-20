# ---------- BASE ----------  
# Imagen base ligera con Node.js
FROM node:20-alpine AS base

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Variables de entorno generales
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV TAILWIND_MODE=build

# ---------- DEPENDENCIAS ----------  
FROM base AS deps

# Copiar archivos de lock y package para aprovechar cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./  
COPY frontend/package.json ./frontend/

# Instalar dependencias sin modificar lockfile y limpiar store
RUN pnpm install --frozen-lockfile --prefer-offline && pnpm store prune

# ---------- BUILD ----------  
FROM deps AS builder

WORKDIR /app/frontend

# Copiar todo el frontend (excluir node_modules, .nuxt, .output con .dockerignore)
COPY frontend/ ./  

# Construir la app y limpiar caches
RUN pnpm run build \
    && rm -rf .nuxt/.cache node_modules/.cache \
    && ls -la .output/public/_nuxt/ | head -10

# ---------- PRODUCCION ----------  
FROM node:20-alpine AS production

# Instalar dependencias de runtime mínimas
RUN apk add --no-cache dumb-init ca-certificates wget \
    && corepack enable && corepack prepare pnpm@latest --activate \
    && update-ca-certificates

WORKDIR /app

# Variables de entorno producción
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copiar solo la app construida
COPY --from=builder /app/frontend/.output ./.output

# Crear usuario no-root y asignar permisos
RUN addgroup -S -g 1001 app && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G app app && \
    chown -R app:app /app && chmod -R 755 /app

USER app

# Healthcheck simple para Nuxt 3
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

# Entrypoint con dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]