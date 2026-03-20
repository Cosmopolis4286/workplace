# ---------- BASE ----------
FROM node:20-slim AS base

# Instalar herramientas necesarias y pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# ---------- BUILDER ----------
FROM base AS builder

# Copiar manifests para aprovechar cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Instalar todas las dependencias usando cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copiar código y tsconfig
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/

WORKDIR /app/backend

# Generar Prisma y compilar TS
RUN pnpm exec prisma generate \
    && pnpm run build

# ---------- PRODUCCIÓN ----------
FROM node:20-slim AS production

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    NODE_PATH=/app/node_modules/.pnpm/node_modules \
    HOME=/home/app

# Crear usuario no-root
RUN groupadd -g 1001 app \
    && useradd -u 1001 -g app -m -d /home/app -s /usr/sbin/nologin app

# Copiar manifests y dependencias prod
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar solo dependencias de producción usando cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Copiar artefactos del builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY scripts ./scripts/

# Ajustar permisos
RUN chown -R app:app /app

USER app

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/init.sh"]