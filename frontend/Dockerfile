# ---------- BASE ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- DEV ----------
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["npm", "run", "dev"]

# ---------- BUILD ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- PROD ----------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.output ./.output

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]