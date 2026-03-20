# ---------- BASE ----------
FROM node:20-slim AS base

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    netcat-openbsd \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# ---------- DEPS ----------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# cache pnpm store
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder

WORKDIR /app

# copiar manifests
COPY --from=deps /app/pnpm-lock.yaml ./
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/backend/prisma ./backend/prisma

# copiar código
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/

# reinstalar (fix definitivo pnpm)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

WORKDIR /app/backend

# prisma + build
RUN pnpm exec prisma generate && \
    pnpm run build

# ---------- PRODUCCIÓN ----------
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    netcat-openbsd \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    NODE_PATH=/app/node_modules/.pnpm/node_modules
ENV HOME=/home/app

# crear usuario primero
RUN groupadd -g 1001 app && \
    useradd -u 1001 -g app -m -d /home/app -s /usr/sbin/nologin app

# copiar manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# instalar SOLO prod (mejor que prune)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# instalar SOLO prod y copiar desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# copiar scripts
COPY scripts ./scripts/

# permisos finales
RUN chown -R app:app /app

USER app

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/init.sh"]