# ---------- BASE (para build) ----------
FROM node:20-alpine AS build

# Dependencias necesarias para build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl-dev \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar lockfile y package.json raíz
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copiar solo package.json de backend para instalar deps
COPY backend/package.json ./backend/

# Instalación con cache de pnpm
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copiar código fuente
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend

# Generar Prisma Client y construir NestJS
RUN pnpm exec prisma generate \
    && pnpm run build \
    && CI=true pnpm prune --prod

# ---------- PRODUCCIÓN ----------
FROM node:20-alpine AS production

# Dependencias necesarias en runtime
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

# Copiar solo lo estrictamente necesario desde build
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --chown=app:app backend/scripts ./scripts/
COPY --from=build /root/.local/share/pnpm/store /root/.local/share/pnpm/store
RUN chmod +x /app/scripts/init.sh

USER app
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "/app/scripts/init.sh"]