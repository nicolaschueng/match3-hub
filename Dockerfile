# syntax=docker/dockerfile:1.6

# ---------- Stage 1: build client ----------
FROM node:20-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- Stage 2: build server (install deps + seed + prewarm) ----------
FROM node:20-bookworm-slim AS server-build
# better-sqlite3 需要编译工具
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --no-audit --no-fund
COPY server/ ./
# 预烤：seed 种子 + 一轮抓取（失败不阻断）
RUN node src/seed.js && node src/prewarm.js || true

# ---------- Stage 3: runtime ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# 复制带有 node_modules 与预烤数据库的 server
COPY --from=server-build /app/server /app/server
# 复制构建好的前端静态资源
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 3001
ENV PORT=3001
WORKDIR /app/server
CMD ["node", "src/index.js"]
