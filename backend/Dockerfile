# ---------- BASE ----------
FROM node:20-slim AS base

# Dependencias del sistema necesarias para Prisma, network checks y procesos
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    netcat-openbsd \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Producción por defecto
ENV NODE_ENV=production

# ---------- DEPS ----------
FROM base AS deps

# Copiamos manifests para cache fuerte de dependencias
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Instalamos TODAS las deps (incluye dev, necesarias para build)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder

WORKDIR /app

# Reutilizamos dependencias cacheadas
COPY --from=deps /app/pnpm-lock.yaml ./
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/backend/prisma ./backend/prisma

# ⚠️ FIX: typo corregido (antes era .tson)
COPY backend/tsconfig.json ./backend/
COPY backend/tsconfig.seed.json ./backend/

# Código fuente
COPY backend/src ./backend/src/

# Instalamos deps nuevamente (seguro para builder)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

WORKDIR /app/backend

# Generar cliente Prisma + build app + build seed
RUN pnpm exec prisma generate && \
    pnpm run build && \
    pnpm tsc -p tsconfig.seed.json

# ---------- PRODUCTION ----------
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    netcat-openbsd \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
ENV HOME=/home/app

# Crear usuario no-root (seguridad)
RUN groupadd -g 1001 app && \
    useradd -u 1001 -g app -m -d /home/app -s /usr/sbin/nologin app

# Copiar manifests y scripts
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./package.json
COPY backend/scripts ./scripts/

# Copiar artefactos desde builder
# 👉 node_modules ya incluye @prisma/client y binarios necesarios
COPY --from=builder /app/node_modules ./node_modules

# 👉 app compilada
COPY --from=builder /app/backend/dist ./dist

# 👉 prisma schema (necesario para migrate/seed/runtime)
COPY --from=builder /app/backend/prisma ./prisma

# 👉 seed compilado (IMPORTANTE)
COPY --from=builder /app/backend/dist-seed ./dist-seed

# Permisos finales
RUN chown -R app:app /app && \
    chmod +x /app/backend/scripts/init.sh

USER app

EXPOSE 3001

# dumb-init evita zombies y maneja señales correctamente
ENTRYPOINT ["dumb-init", "--"]

# Script que:
# 1. espera postgres
# 2. corre migraciones
# 3. ejecuta seed (si aplica)
# 4. levanta la app
CMD ["./scripts/init.sh"]