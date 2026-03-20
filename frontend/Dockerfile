# ---------- BASE ----------  
# Imagen base ultra-ligera con Node.js
FROM node:20-alpine AS base

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Variables de entorno optimizadas
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# ---------- DEPENDENCIAS ----------  
FROM base AS deps

# Copiar archivos de lock para cache eficiente
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./  
COPY frontend/package.json ./frontend/

# Instalar dependencias con cache y limpiar
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# ---------- BUILD ----------  
FROM deps AS builder

WORKDIR /app/frontend

# Copiar solo código fuente (excluido por .dockerignore)
COPY frontend/ ./  

# Construir app con memoria suficiente y limpiar
RUN pnpm run build \
    && rm -rf .nuxt/.cache node_modules/.cache

# ---------- PRODUCCION ----------  
FROM node:20-alpine AS production

# Dependencias runtime mínimas
RUN apk add --no-cache dumb-init ca-certificates \
    && corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Variables de entorno producción optimizadas
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=256"

# Copiar solo build optimizado
COPY --from=builder /app/frontend/.output ./.output

# Crear usuario y permisos optimizados
RUN addgroup -S -g 1001 app && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G app app && \
    chown -R app:app /app

USER app

# Healthcheck ultra-ligero (sin wget)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 3000

# Entrypoint con dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]