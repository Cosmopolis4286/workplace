FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- DEPS ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

# ---------- BUILD ----------
FROM deps AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/frontend
RUN pnpm run build

# ---------- PROD ----------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/frontend/.output ./.output

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]