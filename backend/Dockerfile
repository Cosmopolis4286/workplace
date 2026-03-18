# ---------- BASE ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- DEV ----------
FROM base AS dev
COPY package*.json ./
RUN npm install
COPY . .

ENV NODE_ENV=development

CMD ["npm", "run", "start:dev"]

# ---------- DEPENDENCIES ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ---------- BUILD ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma
RUN npx prisma generate

# build nest
RUN npm run build

# ---------- PRODUCTION ----------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# solo deps necesarias
COPY package*.json ./
RUN npm ci --omit=dev

# copiar build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# prisma engines (IMPORTANTE)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 🔒 no root
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001

CMD ["node", "dist/main.js"]