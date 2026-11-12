# PowerAI Astro — static build served by nginx.
#
# Build:  docker build -t powerai-astro .
# Run:    docker run --rm -p 8080:80 powerai-astro
#
# Node 24 + pnpm only (see `packageManager` in package.json). The lockfile
# is installed frozen; there are no yarn/npm branches — this repo is
# pnpm-only. The build output (`dist/`) is copied into nginx; see
# config/nginx/nginx.conf for the serving rules (Astro 404 page, hashed
# `/_astro/` assets cached immutably).
#
# NOTE: this Dockerfile is reviewed, not build-tested — no Docker daemon
# is available in this environment (`docker` is not installed).

FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# See https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# for why libc6-compat is needed on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm is enabled via corepack in each stage that needs it: stages do not
# share the shims created by `corepack enable` in another stage.
RUN corepack enable && corepack prepare pnpm@12.19.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.19.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Production image, copy the static build and serve it with nginx
FROM nginx:alpine AS runner
COPY ./config/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
