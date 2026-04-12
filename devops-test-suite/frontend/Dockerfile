# ── Stage 1: builder — compile React app with Vite ───────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build
# Output is in /app/dist


# ── Stage 2: production — nginx serving built static files ────────────────────
FROM nginx:1.25-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the Vite build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
