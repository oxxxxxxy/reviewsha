FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock tsconfig.base.json ./
COPY apps apps
COPY packages packages
RUN yarn install --frozen-lockfile --non-interactive
RUN yarn workspace @reviewsha/admin build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY infrastructure/docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
