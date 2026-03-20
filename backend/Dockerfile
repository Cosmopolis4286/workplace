# ---------- BUILD ----------
FROM node:20-alpine AS build

# Dependencias necesarias para compilar Nest/Prisma
RUN apk add --no-cache python3 make g++ openssl-dev \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copiar lockfiles y package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Instalación de todas las dependencias (dev + prod) con caching
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# Copiar código backend
COPY backend ./backend
COPY scripts ./scripts
WORKDIR /app/backend

# Generar Prisma y build de TS
RUN pnpm prisma generate && pnpm build

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

# Dependencias mínimas de sistema
RUN apk add --no-cache dumb-init ca-certificates openssl netcat-openbsd \
    && addgroup -S app -g 1001 \
    && adduser -S app -u 1001 -G app \
    && corepack enable \
    && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copiar archivos de configuración del workspace y backend
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/backend/package.json ./backend/package.json

# Instalar solo dependencias de producción con caching
RUN --mount=type=cache,id=pnpm-prod-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Copiar archivos generados y código
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/scripts ./scripts

WORKDIR /app/backend

# Generar Prisma client en producción
RUN pnpm prisma generate

# Limpieza final de docs y caches
RUN rm -rf node_modules/.cache /tmp/* /var/tmp/* \
    && find node_modules -name "*.md" -delete \
    && find node_modules -name "*.txt" -delete \
    && find node_modules -name "LICENSE" -delete

USER app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "scripts/init.sh"]