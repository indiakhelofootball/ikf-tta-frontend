# TTA React frontend — multi-stage: build with Node, serve static with nginx.
# Build context is the frontend repo root.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# The lockfile was out of sync with package.json — @craco/craco and cross-env were
# declared but never locked, so `npm ci` failed and the G3 client build could not
# run at all. Regenerated and committed 2026-08-15, so the reproducible install is
# back. Keep it as `npm ci`: `npm install` would silently drift the lockfile again
# and take the client build down with it.
RUN npm ci

COPY . .

# API base is relative so nginx can reverse-proxy /api to the backend on the same host.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Stamped into the UI so a running bundle can be identified in the field. .git is
# excluded from the build context (.dockerignore), so the hash cannot be read here
# — pass it in: docker build --build-arg BUILD_ID=$(git rev-parse --short HEAD)
ARG BUILD_ID=docker
ENV BUILD_ID=$BUILD_ID

RUN npm run build

# G3 — a SECOND, separate bundle for external funders. It is built from
# src/client-index.js via craco.config.js, so it contains only the portal, auth
# and theme: none of the internal TTA/CSR page code is reachable from its entry
# point and therefore none of it ships. Route-gating hides an external client's
# data; this is what hides the code.
#
# Emitted with PUBLIC_URL=/client so its asset URLs sit under the same prefix
# nginx serves it from. Sizes at the time of writing: internal ~26 MB across five
# JS chunks, client ~3.5 MB in one.
RUN npm run build:client

# --- serve stage ---
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
# Nested under the internal root so nginx's plain `root` resolves /client/* —
# see the "G3" block in nginx.conf. Copied AFTER the internal build so it is
# never overwritten by it.
COPY --from=build /app/build-client /usr/share/nginx/html/client

EXPOSE 80
