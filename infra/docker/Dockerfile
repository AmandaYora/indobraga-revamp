# Multi-stage build: static frontend + Go API in one container (ADR-0013).
# Finalisasi (healthcheck subcommand, migration tertanam, distroless) di PLAN-04 §4.2.

# --- Stage 1: build frontend -------------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --no-audit --no-fund
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build -w @indobraga/web

# --- Stage 2: build API -------------------------------------------------------------
FROM golang:1.26-alpine AS api
WORKDIR /src/apps/api
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /out/api ./cmd/server

# --- Stage 3: runtime ---------------------------------------------------------------
FROM alpine:3.22
RUN apk add --no-cache ca-certificates \
 && addgroup -S app && adduser -S -G app -H -h /app app
WORKDIR /app
COPY --from=api /out/api ./api
COPY --from=web /repo/apps/web/dist ./public
ENV APP_ENV=production \
    APP_PORT=8080 \
    PUBLIC_DIR=/app/public
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/health >/dev/null || exit 1
CMD ["./api"]
