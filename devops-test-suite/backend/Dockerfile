# ── Stage 1: base — Node 20 + all scanner tools ───────────────────────────────
FROM node:20-slim AS base

# Install system dependencies needed by scanners + curl/wget for downloads
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    gnupg \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Install Hadolint ──────────────────────────────────────────────────────────
RUN wget -qO /usr/local/bin/hadolint \
    https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 \
    && chmod +x /usr/local/bin/hadolint

# ── Install Trivy via official apt repository ─────────────────────────────────
RUN wget -qO- https://aquasecurity.github.io/trivy-repo/deb/public.key \
    | gpg --dearmor > /usr/share/keyrings/trivy.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
       > /etc/apt/sources.list.d/trivy.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends trivy \
    && rm -rf /var/lib/apt/lists/*

# ── Install tfsec ─────────────────────────────────────────────────────────────
RUN wget -qO /usr/local/bin/tfsec \
    https://github.com/aquasecurity/tfsec/releases/download/v1.28.6/tfsec-linux-amd64 \
    && chmod +x /usr/local/bin/tfsec

# ── Install Checkov via pip (inside a venv to avoid PEP 668 issues) ───────────
RUN python3 -m venv /opt/checkov-venv \
    && /opt/checkov-venv/bin/pip install --no-cache-dir checkov
ENV PATH="/opt/checkov-venv/bin:$PATH"

# ── Install Kubeconform ───────────────────────────────────────────────────────
RUN wget -qO /tmp/kubeconform.tar.gz \
    https://github.com/yannh/kubeconform/releases/download/v0.6.4/kubeconform-linux-amd64.tar.gz \
    && tar -xzf /tmp/kubeconform.tar.gz -C /usr/local/bin kubeconform \
    && rm /tmp/kubeconform.tar.gz

# ── Install Polaris ───────────────────────────────────────────────────────────
RUN wget -qO /tmp/polaris.tar.gz \
    https://github.com/FairwindsOps/polaris/releases/download/9.2.0/polaris_linux_amd64.tar.gz \
    && tar -xzf /tmp/polaris.tar.gz -C /usr/local/bin polaris \
    && rm /tmp/polaris.tar.gz

# ── Stage 2: app ──────────────────────────────────────────────────────────────
FROM base AS app

WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/

# Create uploads and history directories (writable by the app)
RUN mkdir -p uploads scan-history-data \
    && chown -R node:node /app

# Run as non-root user
USER node

# Expose backend port
EXPOSE 81

# Health check — hits the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:81/api/ping || exit 1

CMD ["node", "src/server.js"]
