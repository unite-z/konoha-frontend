# Imagen web: la PWA compilada servida por Caddy. Se construye en CI y se publica en GHCR por SHA (konoha-web:<sha>).
# Las rutas de la API son relativas (/api/...), así que la misma imagen sirve para UAT y prod.

FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Rutas relativas: el Caddy de borde envía /api al backend del mismo entorno.
ENV VITE_API_BASE_URL=/api/v1 \
    VITE_API_TERCERIZADOS_URL=/api/tercerizados
RUN npm run build

FROM caddy:2.10-alpine
ARG REVISION=desconocida
LABEL org.opencontainers.image.source="konoha-frontend" \
      org.opencontainers.image.revision="${REVISION}"

RUN addgroup -S web && adduser -S -G web web
ENV XDG_CONFIG_HOME=/tmp/caddy-config XDG_DATA_HOME=/tmp/caddy-data
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build --chown=web:web /build/dist /srv
USER web
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
