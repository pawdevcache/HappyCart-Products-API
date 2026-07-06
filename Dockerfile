# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build          # outputs to /web/dist

# ---- Stage 2: build the Go binary ----
FROM golang:1.23-alpine AS api
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
# Static build so it runs on a bare image with no libc.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server .

# ---- Stage 3: minimal runtime image ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates && adduser -D -u 10001 app
WORKDIR /app
COPY --from=api /out/server ./server
COPY --from=web /web/dist ./web/dist
ENV STATIC_DIR=/app/web/dist
ENV PORT=8080
EXPOSE 8080
USER app
CMD ["./server"]
