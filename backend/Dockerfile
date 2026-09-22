# Lightweight production Dockerfile using pre-compiled Linux ARM64 binary
FROM alpine:3.21

WORKDIR /app

# Install root CA certificates for HTTPS (Google OAuth, Gemini, Groq) and tzdata
RUN apk add --no-cache ca-certificates tzdata

# Copy pre-compiled statically linked Linux ARM64 binary
COPY server /app/server
RUN chmod +x /app/server && mkdir -p /app/data

EXPOSE 8080

ENV PORT=8080
ENV DATABASE_PATH=/app/data/english_test.db

CMD ["/app/server"]
