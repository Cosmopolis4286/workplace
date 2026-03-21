# ---------- BASE ----------
FROM node:20-alpine AS build

# Dependencias para compilar Nest/Prisma
RUN apk add --no-cache python3 make g++ git openssl-dev \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copiar lockfiles y package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalar deps dev + prod con cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# ---------- DEVELOPMENT ----------
FROM build AS development
WORKDIR /app/backend
COPY backend/prisma ./prisma
RUN pnpm prisma generate

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

# Copiar solo lo necesario del backend
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma
COPY backend/tsconfig.json ./backend/
COPY backend/tsconfig.seed.json ./backend/
COPY scripts/init.sh ./scripts/

# Dependencias mínimas en prod
RUN apk add --no-cache dumb-init ca-certificates openssl netcat-openbsd \
    && addgroup -S app -g 1001 \
    && adduser -S app -u 1001 -G app

WORKDIR /app

# Copiar archivos necesarios desde build
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/dist-seed ./backend/dist-seed
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=build /app/scripts/init.sh ./scripts/init.sh

# Variables opcionales, si no vienen del .env se puede dar un fallback
ENV NITRO_LOG_LEVEL=error \
    NODE_OPTIONS="--max-old-space-size=512"

# Instalar solo deps de producción
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    corepack enable && corepack prepare pnpm@9.15.0 --activate \
    && pnpm install --frozen-lockfile --prod

# Limpieza agresiva pero segura
RUN rm -rf node_modules/.cache \
    && find node_modules -name "*.md" -delete \
    && find node_modules -name "*.txt" -delete \
    && find node_modules -name "LICENSE*" -delete \
    && find node_modules -name "CHANGELOG*" -delete \
    && find node_modules -name "README*" -delete \
    && find node_modules -name "*.map" -delete \
    && find node_modules -name "test*" -type d -exec rm -rf {} + 2>/dev/null || true \
    && find node_modules -name "tests*" -type d -exec rm -rf {} + 2>/dev/null || true \
    && find node_modules -name "__tests__*" -type d -exec rm -rf {} + 2>/dev/null || true \
    && rm -rf /tmp/* /var/tmp/* /root/.cache

# Permisos y usuario
RUN chown -R app:app /app
USER app

EXPOSE ${NODE_PORT}

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "scripts/init.sh"]