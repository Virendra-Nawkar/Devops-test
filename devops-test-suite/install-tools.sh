#!/usr/bin/env bash
# =============================================================================
# install-tools.sh — Installs all DevOps Test Suite scanner tools
# =============================================================================
# Usage:  bash install-tools.sh
# Works on: Linux (Ubuntu/Debian/RHEL) and macOS
# Run as:  root (Linux) or normal user (Mac with Homebrew)
# =============================================================================


# -e: exit on error (errors inside if-blocks are still caught)
# -o pipefail: catch errors in piped commands
# Note: intentionally NOT using -u (unbound variable check) because some
# systems initialise arrays differently and it causes false positives.
set -eo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✔  $1${RESET}"; }
info() { echo -e "${BLUE}  →  $1${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠  $1${RESET}"; }
err()  { echo -e "${RED}  ✗  $1${RESET}"; }
step() { echo -e "\n${BOLD}${BLUE}━━ $1 ━━${RESET}"; }

# ── Detect OS ─────────────────────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Linux*)   PLATFORM="linux" ;;
  Darwin*)  PLATFORM="mac"   ;;
  *)
    err "Unsupported OS: $OS"
    echo "This script supports Linux and macOS only."
    exit 1
    ;;
esac

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   DevOps Test Suite — Tool Installer             ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║   Platform: ${PLATFORM}                                  "
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# Keep track of what installed successfully
INSTALLED=()
FAILED=()

# ── Helper: check if a command exists ────────────────────────────────────────
has_cmd() { command -v "$1" &>/dev/null; }

# =============================================================================
# 1. HADOLINT — Dockerfile linter
# =============================================================================
step "Installing Hadolint (Dockerfile linter)"

if has_cmd hadolint; then
  ok "hadolint already installed: $(hadolint --version 2>&1 | head -1)"
  INSTALLED+=("hadolint")
else
  if [ "$PLATFORM" = "linux" ]; then
    info "Downloading hadolint binary for Linux x86_64..."
    if wget -q -O /usr/local/bin/hadolint \
        https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64; then
      chmod +x /usr/local/bin/hadolint
      ok "hadolint installed successfully"
      INSTALLED+=("hadolint")
    else
      err "Failed to download hadolint"
      FAILED+=("hadolint")
    fi
  else
    info "Installing hadolint via Homebrew..."
    if brew install hadolint 2>&1 | tail -1; then
      ok "hadolint installed via Homebrew"
      INSTALLED+=("hadolint")
    else
      err "Failed to install hadolint via Homebrew"
      FAILED+=("hadolint")
    fi
  fi
fi

# =============================================================================
# 2. TRIVY — Container CVE scanner
# =============================================================================
step "Installing Trivy (CVE scanner)"

if has_cmd trivy; then
  ok "trivy already installed: $(trivy --version 2>&1 | head -1)"
  INSTALLED+=("trivy")
else
  if [ "$PLATFORM" = "linux" ]; then
    info "Installing Trivy via official install script..."
    if curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
        | sh -s -- -b /usr/local/bin; then
      ok "Trivy installed successfully"
      INSTALLED+=("trivy")
    else
      err "Failed to install Trivy"
      FAILED+=("trivy")
    fi
  else
    info "Installing Trivy via Homebrew..."
    if brew install aquasecurity/trivy/trivy 2>&1 | tail -1; then
      ok "Trivy installed via Homebrew"
      INSTALLED+=("trivy")
    else
      err "Failed to install Trivy via Homebrew"
      FAILED+=("trivy")
    fi
  fi
fi

# =============================================================================
# 3. TFSEC — Terraform security scanner
# =============================================================================
step "Installing tfsec (Terraform security scanner)"

if has_cmd tfsec; then
  ok "tfsec already installed: $(tfsec --version 2>&1 | head -1)"
  INSTALLED+=("tfsec")
else
  if [ "$PLATFORM" = "linux" ]; then
    info "Downloading tfsec binary for Linux amd64..."
    if curl -sL \
        https://github.com/aquasecurity/tfsec/releases/latest/download/tfsec-linux-amd64 \
        -o /usr/local/bin/tfsec \
      && chmod +x /usr/local/bin/tfsec; then
      ok "tfsec installed successfully"
      INSTALLED+=("tfsec")
    else
      err "Failed to install tfsec"
      FAILED+=("tfsec")
    fi
  else
    info "Installing tfsec via Homebrew..."
    if brew install tfsec 2>&1 | tail -1; then
      ok "tfsec installed via Homebrew"
      INSTALLED+=("tfsec")
    else
      err "Failed to install tfsec via Homebrew"
      FAILED+=("tfsec")
    fi
  fi
fi

# =============================================================================
# 4. CHECKOV — Terraform + K8s compliance scanner (Python)
# =============================================================================
step "Installing Checkov (Terraform/K8s compliance scanner)"

CHECKOV_VENV="/opt/checkov-venv"
CHECKOV_BIN="/usr/local/bin/checkov"

if has_cmd checkov; then
  ok "checkov already installed: $(checkov --version 2>&1 | head -1)"
  INSTALLED+=("checkov")
else
  if [ "$PLATFORM" = "linux" ]; then

    # ── Ensure python3-venv is present ──────────────────────────────────────
    # On Debian/Ubuntu the venv module requires the version-specific package
    # (e.g. python3.12-venv) — installing just python3-venv is not enough.
    info "Ensuring python3-venv is installed..."
    PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "3")
    apt-get install -y "python${PY_VER}-venv" python3-venv python3-full 2>/dev/null || \
    yum install -y python3-venv 2>/dev/null || true

    # ── Method 1: pipx (cleanest, works on any distro) ──────────────────────
    if has_cmd pipx; then
      info "Installing Checkov via pipx..."
      if pipx install checkov --quiet 2>/dev/null; then
        pipx ensurepath --quiet 2>/dev/null || true
        ok "Checkov installed via pipx"
        INSTALLED+=("checkov")
      else
        warn "pipx install failed — falling back to venv method"
      fi
    fi

    # ── Method 2: dedicated venv (works on Ubuntu 22.04+ / Debian 12+ with PEP 668) ──
    if ! has_cmd checkov; then
      info "Installing Checkov into a dedicated venv at ${CHECKOV_VENV}..."
      if python3 -m venv "$CHECKOV_VENV" \
          && "$CHECKOV_VENV/bin/pip" install --quiet --upgrade pip \
          && "$CHECKOV_VENV/bin/pip" install --quiet checkov; then
        # Create a wrapper symlink so 'checkov' works system-wide
        ln -sf "$CHECKOV_VENV/bin/checkov" "$CHECKOV_BIN"
        ok "Checkov installed in venv and symlinked to /usr/local/bin/checkov"
        INSTALLED+=("checkov")
      else
        err "Failed to install Checkov via venv"
        FAILED+=("checkov")
      fi
    fi

  else
    # macOS
    info "Installing Checkov via pip3 (macOS)..."
    if pip3 install checkov --quiet 2>/dev/null \
        || pip3 install checkov --quiet --break-system-packages 2>/dev/null; then
      ok "Checkov installed on macOS"
      INSTALLED+=("checkov")
    else
      err "Failed to install Checkov on macOS"
      FAILED+=("checkov")
    fi
  fi
fi

# =============================================================================
# 5. KUBECONFORM — Kubernetes YAML schema validator
# =============================================================================
step "Installing Kubeconform (K8s YAML validator)"

if has_cmd kubeconform; then
  ok "kubeconform already installed: $(kubeconform -v 2>&1 | head -1)"
  INSTALLED+=("kubeconform")
else
  if [ "$PLATFORM" = "linux" ]; then
    info "Downloading and extracting kubeconform for Linux amd64..."
    if curl -sL \
        https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz \
        | tar xz -C /usr/local/bin; then
      chmod +x /usr/local/bin/kubeconform 2>/dev/null || true
      ok "kubeconform installed successfully"
      INSTALLED+=("kubeconform")
    else
      err "Failed to install kubeconform"
      FAILED+=("kubeconform")
    fi
  else
    info "Installing kubeconform via Homebrew..."
    if brew install kubeconform 2>&1 | tail -1; then
      ok "kubeconform installed via Homebrew"
      INSTALLED+=("kubeconform")
    else
      err "Failed to install kubeconform via Homebrew"
      FAILED+=("kubeconform")
    fi
  fi
fi

# =============================================================================
# 6. POLARIS — Kubernetes best practices auditor
# =============================================================================
step "Installing Polaris (K8s best practices auditor)"

if has_cmd polaris; then
  ok "polaris already installed: $(polaris version 2>&1 | head -1)"
  INSTALLED+=("polaris")
else
  if [ "$PLATFORM" = "linux" ]; then
    info "Downloading and extracting Polaris for Linux amd64..."
    if curl -sL \
        https://github.com/FairwindsOps/polaris/releases/latest/download/polaris_linux_amd64.tar.gz \
        | tar xz -C /usr/local/bin polaris; then
      chmod +x /usr/local/bin/polaris 2>/dev/null || true
      ok "Polaris installed successfully"
      INSTALLED+=("polaris")
    else
      err "Failed to install Polaris"
      FAILED+=("polaris")
    fi
  else
    info "Installing Polaris via Homebrew..."
    if brew tap FairwindsOps/tap 2>/dev/null && \
       brew install fairwinds-ops/tap/polaris 2>&1 | tail -1; then
      ok "Polaris installed via Homebrew"
      INSTALLED+=("polaris")
    else
      err "Failed to install Polaris via Homebrew"
      FAILED+=("polaris")
    fi
  fi
fi

# =============================================================================
# VERIFICATION — run --version for each tool
# =============================================================================
echo ""
echo -e "${BOLD}━━ Verifying installations ━━${RESET}"
echo ""

verify_tool() {
  local name="$1"
  local cmd="$2"
  if has_cmd "$name"; then
    local version
    version=$(eval "$cmd" 2>&1 | head -1)
    echo -e "  ${GREEN}✔${RESET} ${BOLD}${name}${RESET}: ${version}"
  else
    echo -e "  ${RED}✗${RESET} ${BOLD}${name}${RESET}: NOT FOUND"
  fi
}

verify_tool "hadolint"    "hadolint --version"
verify_tool "trivy"       "trivy --version"
verify_tool "tfsec"       "tfsec --version"
verify_tool "checkov"     "checkov --version"
verify_tool "kubeconform" "kubeconform -v"
verify_tool "polaris"     "polaris version"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BOLD}━━ Summary ━━${RESET}"
echo ""
echo -e "  ${GREEN}Installed (${#INSTALLED[@]}):${RESET} ${INSTALLED[*]:-none}"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "  ${RED}Failed    (${#FAILED[@]}):${RESET} ${FAILED[*]}"
  echo ""
  warn "Some tools failed to install. Check error messages above."
  warn "You can still use the scanner — tools that failed will show an INFO finding."
else
  echo ""
  ok "All 6 scanner tools installed successfully!"
fi

echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo "  1. cd backend && npm install && node src/server.js"
echo "  2. cd frontend && npm install && npm run dev"
echo "  3. Open http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):80"
echo ""
