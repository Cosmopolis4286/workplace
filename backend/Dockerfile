# ---------- BUILD ----------
FROM node:20-alpine AS build

# Instalar dependencias de build mínimas
RUN apk add --no-cache --no-interactive \
    python3 \
    make \
    g++ \
    git \
    openssl-dev \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Archivos base
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar TODAS las deps (build necesita dev)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile \
    && rm -rf /tmp/* /var/tmp/*

# Código fuente
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend

# Build + prisma + seed
RUN pnpm run prisma:generate \
    && pnpm run build \
    && mkdir -p dist-seed/prisma \
    && npx tsc prisma/seed.ts --outDir dist-seed/prisma --target ES2021 --module commonjs --esModuleInterop true --skipLibCheck true \
    && find node_modules -name ".prisma" -type d | head -1 | xargs ls -la \
    && rm -rf /tmp/* /var/tmp/*

# ---------- MIGRATIONS ----------
FROM node:20-alpine AS migrations

# Instalar dependencias de build y SSL
RUN apk add --no-cache --no-interactive \
    python3 \
    make \
    g++ \
    git \
    openssl-dev \
    openssl \
    libssl3 \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Archivos base
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar TODAS las deps (incluyendo dev para Prisma CLI)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile \
    && rm -rf /tmp/* /var/tmp/*

# Código fuente
COPY backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

# Instalar dependencias runtime ultra mínimas
RUN apk add --no-cache --no-interactive \
    dumb-init \
    ca-certificates \
    && addgroup -g 1001 -S app \
    && adduser -S -u 1001 -G app -s /sbin/nologin app \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/* /usr/share/man/* /usr/share/doc/*

WORKDIR /app/backend

# Copiar todo lo necesario desde build (ya optimizado)
COPY --from=build --chown=app:app /app/backend/package.json ./package.json
COPY --from=build --chown=app:app /app/backend/node_modules ./node_modules/
COPY --from=build --chown=app:app /app/backend/dist ./dist/
COPY --from=build --chown=app:app /app/backend/prisma ./prisma/
COPY --from=build --chown=app:app /app/backend/dist-seed ./dist-seed/
COPY --chown=app:app scripts ./scripts/

# Limpiar caches y reducir tamaño
RUN pnpm store prune --force \
    && rm -rf /tmp/* /var/tmp/* /root/.local/share/pnpm \
    && npm cache clean --force 2>/dev/null || true

USER app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "scripts/init.sh"]