# ---------- BUILD ----------
FROM node:20-alpine AS build

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Base
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar deps (cacheable)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install

# Código
COPY backend ./backend

WORKDIR /app/backend

# Build + prisma
RUN pnpm prisma generate \
    && pnpm build

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    openssl \
    postgresql-client \
    && addgroup -S app -g 1001 \
    && adduser -S app -u 1001 -G app \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app/backend

# Copiar package files
COPY --from=build --chown=app:app /app/backend/package.json ./
COPY --from=build --chown=app:app /app/pnpm-lock.yaml ./

# Instalar dependencias de producción
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --no-frozen-lockfile \
    && chown -R app:app node_modules \
    && rm -rf /tmp/* /var/tmp/*

# Copiar dist y prisma
COPY --from=build --chown=app:app /app/backend/dist ./dist
COPY --from=build --chown=app:app /app/backend/prisma ./prisma
COPY --chown=app:app scripts ./scripts

# 🔥 eliminar basura real
RUN rm -rf \
    node_modules/.cache \
    /root/.npm \
    /root/.local \
    /tmp/* \
    /var/tmp/*

USER app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "scripts/init.sh"]