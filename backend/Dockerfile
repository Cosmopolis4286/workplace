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
RUN pnpm run prisma:generate \
    && pnpm run build \
    && mkdir -p dist-seed/prisma \
    && npx tsc prisma/seed.ts --outDir dist-seed/prisma --target ES2021 --module commonjs --esModuleInterop true --skipLibCheck true \
    && rm -rf /tmp/* /var/tmp/*

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

# Instalar dependencias runtime + build temporales
RUN apk add --no-cache --no-interactive \
    dumb-init \
    ca-certificates \
    openssl \
    openssl-dev \
    python3 \
    make \
    g++ \
    && addgroup -g 1001 -S app \
    && adduser -S -u 1001 -G app -s /sbin/nologin app \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/* /usr/share/man/* /usr/share/doc/*

WORKDIR /app/backend

# Archivos necesarios para instalar SOLO producción
COPY backend/package.json ./package.json
COPY pnpm-lock.yaml ./

# Instalar deps y reconstruir módulos nativos
RUN pnpm install --prod --no-frozen-lockfile --ignore-scripts \
    && pnpm add -D prisma \
    && pnpm rebuild bcrypt \
    && pnpm store prune --force \
    && rm -rf /root/.pnpm-store /tmp/*

# Eliminar dependencias de build para reducir tamaño (mantener SSL)
RUN apk del --no-network python3 make g++

WORKDIR /app/backend

# Copiar solo archivos esenciales desde build
COPY --from=build --chown=app:app /app/backend/dist ./dist/
COPY --from=build --chown=app:app /app/backend/prisma ./prisma/
COPY --from=build --chown=app:app /app/backend/dist-seed ./dist-seed/
COPY --chown=app:app scripts ./scripts/

# Generar Prisma client en producción
RUN pnpm exec prisma generate

# Limpiar después de copiar
RUN rm -rf /tmp/* /var/tmp/*

USER app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "scripts/init.sh"]