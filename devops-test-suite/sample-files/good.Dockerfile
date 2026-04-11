# GOOD Dockerfile — follows all security best practices
# Upload this to the Dockerfile scanner to see a high score
# Expected: few or no findings, score close to 100

# ── Stage 1: build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# ── Stage 2: runtime (minimal image) ────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy only the built artifacts from the build stage
COPY --from=builder /app .

# Create a non-root user and group (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Switch to non-root user
USER appuser

# Expose only the required port
EXPOSE 3000

# Health check so Docker and Kubernetes know the app is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Use exec form (not shell form) for proper signal handling
CMD ["node", "server.js"]
