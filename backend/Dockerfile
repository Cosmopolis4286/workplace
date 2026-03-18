# ---------- BASE ----------
FROM node:20-alpine AS base
WORKDIR /app

# utilidades
RUN apk add --no-cache netcat-openbsd

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- DEPENDENCIAS ----------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile

# ---------- BUILD ----------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/backend

RUN pnpm --filter backend exec prisma generate
RUN pnpm run build

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

RUN pnpm install --prod --frozen-lockfile

# copiar build
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

# prisma engines
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# usuario no root
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001

CMD ["node", "dist/main.js"]