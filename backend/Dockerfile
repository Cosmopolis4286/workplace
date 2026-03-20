# ---------- BASE ----------
FROM node:20-alpine AS base

RUN apk add --no-cache \
    openssl \
    ca-certificates \
    dumb-init \
    netcat-openbsd \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /app

# ---------- DEPS ----------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/tsconfig.json ./backend/
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY backend/src ./backend/src/

WORKDIR /app/backend

RUN pnpm exec prisma generate && \
    pnpm run build

# ---------- PRODUCCIÓN ----------
FROM node:20-alpine AS production

RUN apk add --no-cache \
    openssl \
    ca-certificates \
    dumb-init \
    netcat-openbsd \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && addgroup -g 1001 app && \
    adduser -D -u 1001 -G app -s /bin/sh app

WORKDIR /app

ENV NODE_ENV=production PORT=3001

# Copiar solo lo necesario de node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copiar manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Copiar build y prisma
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma

# Copiar scripts
COPY scripts ./scripts/

# Permisos optimizados
RUN chown -R app:app /app && \
    mkdir -p /home/app/.cache/node/corepack && \
    chown app:app /home/app/.cache/node/corepack

USER app

WORKDIR /app/backend

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/init.sh"]