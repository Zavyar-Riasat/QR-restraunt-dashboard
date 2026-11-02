# ============================================================================
# Dineflow Multi-Restaurant POS & Direct Ordering Platform
# Coolify Production Dockerfile (Frontend + Node API + PostgreSQL Client)
# ============================================================================

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["node", "server/index.js"]

