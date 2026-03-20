# ---------- BASE ----------
FROM node:20-slim AS base

WORKDIR /app/backend
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    openssl \
    ca-certificates \
    netcat-openbsd \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN groupadd -g 1001 app && \
    useradd -u 1001 -g app -m -d /home/app -s /usr/sbin/nologin app

# ---------- DEPS ----------
FROM base AS deps

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Instalar todas las deps (dev incluidas para builder)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder

WORKDIR /app

# Reutilizar node_modules cacheadas
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./ 
COPY --from=deps /app/pnpm-lock.yaml ./ 
COPY --from=deps /app/pnpm-workspace.yaml ./ 
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/backend/prisma ./backend/prisma

COPY backend/tsconfig.json ./backend/
COPY backend/tsconfig.seed.json ./backend/
COPY backend/src ./backend/src/

WORKDIR /app/backend
RUN pnpm exec prisma generate && \
    pnpm run build && \
    pnpm tsc -p tsconfig.seed.json

# ---------- PRODUCTION ----------
FROM base AS production

WORKDIR /app/backend

# Solo dependencias de producción
COPY backend/package.json ./package.json
COPY pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --no-frozen-lockfile

# Copiar build artifacts
COPY --from=builder /app/backend/dist ./dist
COPY backend/prisma ./prisma
COPY backend/scripts ./scripts

RUN chown -R app:app /app && chmod +x ./scripts/init.sh
USER app

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/init.sh"]