# ---------- BASE ----------
FROM node:20-slim AS base

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# ---------- DEPS (CACHE FUERTE) ----------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# ⚡ cache pnpm store
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- BUILDER ----------
FROM base AS builder

WORKDIR /app

# 🔥 NO copiar node_modules (esto era el bug)
# copiar manifests
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/backend/prisma ./backend/prisma

# copiar código
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/

# ⚡ reinstalar (fix definitivo pnpm)
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
    dumb-init \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# 👇 copiar manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# 👇 instalar SOLO prod (🔥 mejor que prune)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# 👇 copiar build
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# usuario seguro
RUN groupadd -g 1001 app && \
    useradd -u 1001 -g app -s /usr/sbin/nologin app && \
    chown -R app:app /app

USER app

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]