FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock tsconfig.base.json ./
COPY apps apps
COPY packages packages
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 120000
RUN yarn workspace @reviewsha/api prisma:generate
RUN yarn workspace @reviewsha/worker build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    p7zip-full unrar-free libarchive-tools poppler-utils libreoffice \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 reviewsha
COPY --from=build --chown=reviewsha:reviewsha /app/node_modules ./node_modules
COPY --from=build --chown=reviewsha:reviewsha /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=reviewsha:reviewsha /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=reviewsha:reviewsha /app/packages/config ./packages/config
COPY --from=build --chown=reviewsha:reviewsha /app/packages/types ./packages/types
USER reviewsha
CMD ["node", "apps/worker/dist/main.js"]
