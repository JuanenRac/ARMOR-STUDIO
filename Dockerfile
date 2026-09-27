# ARMOR-STUDIO static web build.
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html tsconfig.json tsconfig.app.json vite.config.ts armor.project.json ./
COPY src ./src
RUN npm run build

FROM nginx:1.29-alpine
# The template is rendered with the two variables below when the container starts.
ENV ARMOR_PUBLIC_ORIGIN=http://127.0.0.1:8088 \
    ARMOR_SERVER_UPSTREAM=server:8080 \
    NGINX_ENVSUBST_FILTER=ARMOR_
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=4s --retries=3 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
