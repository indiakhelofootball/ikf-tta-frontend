# TTA React frontend — multi-stage: build with Node, serve static with nginx.
# Build context is the frontend repo root.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# NOTE: package-lock.json is currently out of sync with package.json (missing
# @craco/craco + deps), so strict `npm ci` fails. Using `npm install` until the
# lockfile is regenerated and committed, after which this can go back to `npm ci`.
RUN npm install

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

# --- serve stage ---
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
