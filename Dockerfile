FROM node:22-bookworm-slim AS deps
WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund

FROM deps AS build
WORKDIR /workspace

ENV NX_DAEMON=false \
    NX_NO_CLOUD=true \
    NODE_ENV=production

COPY . .

RUN npx nx build server \
    && npx nx build web

FROM deps AS prod-deps
WORKDIR /app

COPY --from=build /workspace/dist/apps/server/package.json ./package.json
COPY --from=build /workspace/dist/apps/server/package-lock.json ./package-lock.json
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000
    
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/apps/server/main.js"]
