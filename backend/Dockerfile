# ---------- BUILD ----------
FROM node:20-alpine AS build

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl-dev \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /app

# Archivos base
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar TODAS las deps (build necesita dev)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# Código fuente
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend

# Build + prisma
RUN pnpm exec prisma generate \
    && pnpm run build

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

RUN apk add --no-cache \
    openssl \
    ca-certificates \
    dumb-init \
    netcat-openbsd \
    && addgroup -g 1001 app \
    && adduser -D -u 1001 -G app -s /bin/sh app \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /app

# Archivos necesarios para instalar SOLO producción
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar SOLO deps de producción (clave)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --no-frozen-lockfile

# Copiar build
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --chown=app:app backend/scripts ./scripts/

RUN chmod +x /app/scripts/init.sh

USER app
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "/app/scripts/init.sh"]