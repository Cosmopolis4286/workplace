# ---------- BASE ----------
FROM node:20-alpine AS base
WORKDIR /app

# utilidades necesarias
RUN apk add --no-cache netcat-openbsd bash

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- DEPENDENCIAS ----------
FROM base AS deps

# copiar lock y package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# instalar todas las dependencias (dev + prod)
RUN pnpm install --frozen-lockfile

# ---------- BUILD ----------
FROM base AS builder
WORKDIR /app

# copiar node_modules y código fuente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/backend

# generar cliente Prisma
RUN npx prisma@5.9.1 generate --schema=./prisma/schema.prisma

# compilar TypeScript
RUN pnpm run build

# ---------- PRODUCTION ----------
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# copiar solo dependencias de producción
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
RUN pnpm install --prod --frozen-lockfile

# copiar build y cliente Prisma generado
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# usuario no root
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001
CMD ["node", "dist/main.js"]