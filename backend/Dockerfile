# Multi-stage lightweight Dockerfile for Go SQLite backend
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Copy dependency definitions
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .

# Final minimal production image (~20MB)
FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/server /app/server

# Create directory for persistent SQLite database
RUN mkdir -p /app/data

EXPOSE 8080

ENV PORT=8080
ENV DATABASE_PATH=/app/data/english_test.db

CMD ["/app/server"]
