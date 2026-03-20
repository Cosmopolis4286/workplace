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

# Build + prisma
RUN pnpm exec prisma generate \
    && pnpm run build \
    && rm -rf /tmp/* /var/tmp/*

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

# Archivos necesarios para instalar SOLO producción
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar SOLO deps de producción con pnpm optimizado
RUN pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm store prune --force \
    && rm -rf /root/.pnpm-store /tmp/*

WORKDIR /app

# Copiar solo archivos esenciales
COPY --from=build --chown=app:app /app/backend/dist ./dist/
COPY --from=build --chown=app:app /app/backend/prisma ./prisma/
COPY --from=build --chown=app:app /app/backend/node_modules ./node_modules/
COPY --chown=app:app backend/scripts ./scripts/

# Limpiar después de copiar
RUN rm -rf /tmp/* /var/tmp/*

USER app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "/app/scripts/init.sh"]