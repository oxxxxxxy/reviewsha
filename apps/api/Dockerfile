FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock tsconfig.base.json ./
COPY apps apps
COPY packages packages
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 120000
RUN yarn workspace @reviewsha/api prisma:generate
RUN yarn workspace @reviewsha/api build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN useradd --create-home --uid 10001 reviewsha
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
USER reviewsha
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
