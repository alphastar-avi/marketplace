# Multi-stage build for smaller, secure image
FROM golang:1.23-alpine AS builder

# Install git for go mod download
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o marketplace-server main.go

# Final stage - minimal image
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy binary from builder stage
COPY --from=builder /app/marketplace-server .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the binary
CMD ["./marketplace-server"]
