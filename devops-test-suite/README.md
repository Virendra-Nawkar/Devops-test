# DevOps Test Suite

> A unified **Infrastructure Security Dashboard** — upload Dockerfiles, Kubernetes YAML, and Terraform files to get instant security scores with plain-English explanations and exact code fixes.

Built for DevOps learners who want hands-on practice with real open-source security tools.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [Architecture Overview](#2-architecture-overview)
3. [Prerequisites](#3-prerequisites)
4. [Setup — Without Docker (Direct / Dev mode)](#4-setup--without-docker-direct--dev-mode)
5. [Setup — With Docker (Production mode)](#5-setup--with-docker-production-mode)
6. [How to Use the Dashboard](#6-how-to-use-the-dashboard)
7. [Scanner Tools Explained](#7-scanner-tools-explained)
8. [How Scoring Works](#8-how-scoring-works)
9. [Understanding Findings](#9-understanding-findings)
10. [API Reference](#10-api-reference)
11. [Changing Your VM IP](#11-changing-your-vm-ip)
12. [Troubleshooting](#12-troubleshooting)
13. [Project Structure](#13-project-structure)

---

## 1. What This Project Does

You upload an infrastructure file → the app runs multiple security scanners → you get a score out of 100 with every issue explained in plain English.

| Upload this | Tools used | What you learn |
|-------------|-----------|----------------|
| **Dockerfile** | Hadolint (lint) + Trivy (CVE scan) | Best practices, root user, CVEs |
| **Kubernetes YAML** | Kubeconform (schema) + Polaris (best practices) | Probes, resource limits, security context |
| **Terraform `.tf` files** | tfsec (security) + Checkov (compliance) | Open ports, unencrypted storage, public IPs |

Every finding expands to show:
- The **exact lines** in your file that caused the issue (highlighted in red)
- **Why it matters** in plain English
- **How to fix it** with a sample code block
- A **learn more** link to the official docs

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│  Your Browser                                                  │
│  http://VM_IP:80                                               │
└──────────────────────┬─────────────────────────────────────────┘
                       │ HTTP (port 80)
┌──────────────────────▼─────────────────────────────────────────┐
│  Frontend  — React 18 + Vite + Tailwind CSS (port 80)          │
│  • Upload zones (drag & drop)                                  │
│  • Score circles with animation                                │
│  • Expandable findings accordion                               │
│  • Scan history panel                                          │
└──────────────────────┬─────────────────────────────────────────┘
                       │ /api/* proxy (port 81)
┌──────────────────────▼─────────────────────────────────────────┐
│  Backend  — Node.js 20 + Express (port 81)                     │
│  • Multer: receives uploaded files                             │
│  • child_process: runs scanner CLIs                            │
│  • explanations.json: 70+ rule explanations                    │
│  • scoreEngine: calculates score 0-100                         │
│  • historyStore: saves last 10 scans to JSON file              │
└──────────┬──────────┬──────────┬────────────────────────────────┘
           │          │          │
     ┌─────▼──┐  ┌────▼───┐  ┌──▼──────┐
     │Hadolint│  │  tfsec │  │Kubecnfrm│
     │ Trivy  │  │Checkov │  │ Polaris │
     └────────┘  └────────┘  └─────────┘
     CLI tools installed on the host machine
```

**Flow:**
1. Browser uploads file → POST /api/scan/docker (or k8s / terraform)
2. Express saves it to `uploads/` temporarily
3. Scanner CLIs run on the file, output JSON
4. Backend parses JSON → looks up explanation in database → calculates score
5. Returns `{ score, grade, findings: [{code, line, codeSnippet, why, fix}] }`
6. Frontend renders results with animated score circle and accordion findings

---

## 3. Prerequisites

> **Starting from a brand-new Linux VM?** Run the commands in this section top to bottom — they cover everything you need. Takes about 5 minutes.

---

### For Direct / Dev Mode (no Docker)

#### Step A — System utilities (always run this first)
```bash
sudo apt-get update
sudo apt-get install -y curl wget git ca-certificates gnupg lsb-release \
    python3 python3-pip python3-venv python3-full
```

> **Why `python3-venv` and `python3-full`?** Ubuntu 22.04+ and Debian 12+ block system-wide `pip install` (PEP 668). The install script uses a dedicated virtual environment automatically — no manual steps needed.

---

#### Step B — Node.js 20
```bash
# Add the NodeSource repo for Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v    # should show v20.x.x
npm -v     # should show 10.x.x
```

---

#### Step C — Fix port permissions (Linux only)

Linux blocks non-root processes from binding to ports below 1024. Only port **80** (frontend) needs this fix — port **8081** (backend) is already above 1024 and works without it:

```bash
# Apply immediately
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Make permanent — survives reboots
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.conf
```

---

#### Step D — Install all 6 scanner tools (one command)
```bash
sudo bash install-tools.sh
```

What this installs and how:

| Tool | Method | Scans |
|------|--------|-------|
| **Hadolint** | Binary download | Dockerfile linting |
| **Trivy** | Binary download | CVEs in containers |
| **tfsec** | Binary download | Terraform security |
| **Checkov** | Python venv at `/opt/checkov-venv` | Terraform + K8s compliance |
| **Kubeconform** | Binary download | K8s schema validation |
| **Polaris** | Binary download | K8s best practices |

> **Checkov note:** On Ubuntu 22.04 / Debian 12 or newer, `pip install` is blocked system-wide (PEP 668 rule). The script automatically creates a virtual environment at `/opt/checkov-venv` and symlinks the binary to `/usr/local/bin/checkov`. No manual steps required.

Expected final output:
```
  ✔ hadolint: Haskell Dockerfile Linter 2.x.x
  ✔ trivy: Version: 0.x.x
  ✔ tfsec: v1.x.x
  ✔ checkov: 3.x.x
  ✔ kubeconform: v0.x.x
  ✔ polaris: Polaris version:x.x.x

  All 6 scanner tools installed successfully!
```

---

### For Docker / Production Mode

Only two things needed on the host — all scanner tools are baked into the container image:

```bash
# Install Docker Engine (official one-liner)
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version          # Docker 24.x or newer
docker compose version    # v2.x or newer
```

> **If `docker compose version` fails**, install the plugin manually:
> ```bash
> sudo apt-get install -y docker-compose-plugin
> ```

---

## 4. Setup — Without Docker (Direct / Dev mode)

Use this mode for development and learning. Hot-reload is active on both frontend and backend.

### Step 1 — Clone the repo
```bash
git clone https://github.com/Virendra-Nawkar/Devops-test.git
cd Devops-test/devops-test-suite
```

### Step 2 — Set your VM IP
```bash
# Find your VM's public IP
hostname -I | awk '{print $1}'

# Edit the backend config
nano backend/.env
```
Change these two lines to match your VM's IP:
```
VM_IP=YOUR_VM_IP
CORS_ORIGIN=http://YOUR_VM_IP
```

### Step 3 — Install scanner tools
```bash
sudo bash install-tools.sh
```
This is a one-time step. Re-running it is safe — already-installed tools are skipped.

### Step 4 — Fix port permissions (if not already done)
```bash
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.conf
```

### Step 5 — Start the backend (Terminal 1)
```bash
cd backend
npm install
node src/server.js
```
Expected output:
```
╔════════════════════════════════════════════════╗
║      DevOps Test Suite — Backend API           ║
║  Listening on  http://0.0.0.0:8081               ║
╚════════════════════════════════════════════════╝
```

### Step 6 — Start the frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Expected output:
```
VITE v5.x  ready in 290ms
➜  Local:   http://localhost:80/
➜  Network: http://YOUR_VM_IP:80/
```

### Step 7 — Open the dashboard
```
http://YOUR_VM_IP:80
```

---

## 5. Setup — With Docker (Production mode)

Use this mode to deploy permanently on a server. Everything runs in containers — no manual tool installation needed.

### Step 1 — Clone the repo
```bash
git clone https://github.com/Virendra-Nawkar/Devops-test.git
cd Devops-test/devops-test-suite
```

### Step 2 — Set your VM IP
```bash
nano .env
```
```
VM_IP=YOUR_VM_IP
```

### Step 3 — Build and start all containers
```bash
docker compose up --build -d
```

First build takes **5-10 minutes** (installs all scanner tools inside the container).

### Step 4 — Open the dashboard
```
http://YOUR_VM_IP:80
```

### Useful Docker commands
```bash
# View logs
docker compose logs -f

# View logs for one service
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and delete volumes (wipes scan history)
docker compose down -v

# Rebuild after code changes
docker compose up --build -d

# Check container status
docker compose ps

# Run a command inside the backend container
docker compose exec backend node -e "console.log('hello')"
```

---

## 6. How to Use the Dashboard

### Quick start with sample files

The `sample-files/` folder has ready-made test files. Use them to try the dashboard immediately:

| File | Expected score | Purpose |
|------|----------------|---------|
| `bad.Dockerfile` | ~40 | Tests all Dockerfile rules |
| `good.Dockerfile` | ~95 | Shows what good looks like |
| `bad-deployment.yaml` | ~30 | Tests K8s misconfigurations |
| `good-deployment.yaml` | ~95 | Best-practice K8s |
| `bad-main.tf` | ~20 | Tests Terraform security issues |
| `good-main.tf` | ~90 | Secure Terraform |

### Step-by-step usage

**1. Choose a tab** — Dockerfile, Kubernetes, or Terraform

**2. Upload your file**
- Click the dashed upload zone, or drag a file onto it
- For Terraform: hold Ctrl/Cmd to select multiple `.tf` files at once
- For Dockerfile with CVE scanning: type a Docker image name in the optional field (e.g. `ubuntu:22.04`)

**3. Click Scan**
- Watch the progress bar show which scanner is running
- Scan takes 3–15 seconds (longer if Trivy pulls an image for the first time)

**4. Read the results**
- The score circle shows your score (0–100) with a grade
- The Overall Report Card at the top shows all three scan types together
- Click any finding row to expand it and see:
  - The exact lines from your file (error line highlighted in red)
  - Why the issue matters
  - A fixed code sample
  - A learn-more link

**5. Filter findings**
- Click severity pills (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) to filter
- Click `ALL` to show everything
- Findings are sorted most-severe first

**6. Check history**
- Click the **History** button (top right)
- See your last 10 scans with scores and timestamps

---

## 7. Scanner Tools Explained

### Hadolint — Dockerfile linter
- **What it does:** Reads your Dockerfile line by line and checks it against a list of rules
- **Rule format:** `DL3xxx` (Dockerfile rules), `SC2xxx` (shell script rules)
- **Example catches:** Running as root, missing version pins, wrong CMD format
- **Docs:** https://github.com/hadolint/hadolint

### Trivy — CVE scanner
- **What it does:** Scans a Docker image against a database of known CVEs (Common Vulnerabilities and Exposures)
- **Requires:** A Docker image name (e.g. `ubuntu:22.04`) in the optional field
- **CVE database:** NVD, GitHub Advisory, OS vendor databases (updated regularly)
- **Docs:** https://github.com/aquasecurity/trivy

### tfsec — Terraform security scanner
- **What it does:** Statically analyses `.tf` files for security misconfigurations
- **Rule format:** `AVD-AZU-xxxx`, `AVD-AWS-xxxx`, `AVD-GCP-xxxx`
- **Example catches:** Open security groups, unencrypted storage, public IP addresses
- **Docs:** https://github.com/aquasecurity/tfsec

### Checkov — Terraform + Kubernetes compliance scanner
- **What it does:** Policy-as-code — checks files against hundreds of compliance rules
- **Rule format:** `CKV_K8S_xx`, `CKV_AZURE_xx`, `CKV_AWS_xx`, `CKV_DOCKER_x`
- **Example catches:** Missing health probes, no resource limits, insecure storage
- **Docs:** https://www.checkov.io/

### Kubeconform — Kubernetes schema validator
- **What it does:** Validates your YAML against the official Kubernetes API schema
- **Catches:** Wrong field names, missing required fields, wrong API versions
- **Docs:** https://github.com/yannh/kubeconform

### Polaris — Kubernetes best-practice auditor
- **What it does:** Checks Kubernetes workloads against Fairwinds best practices
- **Rule format:** camelCase check names (e.g. `runAsNonRoot`, `cpuLimitsMissing`)
- **Example catches:** No probes, missing resource limits, privilege escalation allowed
- **Docs:** https://polaris.docs.fairwinds.com/

---

## 8. How Scoring Works

Every scan starts at **100** and deducts points per finding:

| Severity | Points deducted | Example |
|----------|----------------|---------|
| CRITICAL | −20 | Unrestricted internet ingress (NSG allows 0.0.0.0/0) |
| HIGH | −10 | Container running as root |
| MEDIUM | −5 | Missing liveness probe |
| LOW | −2 | No --no-cache on apk add |
| INFO | 0 | Informational finding only |

Minimum score is **0** (never goes negative).

| Score | Grade | Meaning |
|-------|-------|---------|
| 90–100 | Excellent | Production-ready — great patterns to copy |
| 70–89 | Good | Minor issues — fix MEDIUM findings to reach 90+ |
| 50–69 | Needs Work | Real problems present — fix HIGH findings first |
| 0–49 | Critical Issues | Do not deploy — fix CRITICAL and HIGH immediately |

**Example calculation:**
```
File has: 1 CRITICAL + 3 HIGH + 2 MEDIUM
Score = 100 - (1×20) - (3×10) - (2×5) = 100 - 20 - 30 - 10 = 40 → Critical Issues
```

---

## 9. Understanding Findings

When you click a finding row it expands to four sections:

```
📍 Problematic code — line 10
┌──────────────────────────────────────┐
│  8  │  COPY . .                      │
│  9  │  RUN pip3 install flask        │
│▶ 10 │  USER root      ← red line     │
│ 11  │  CMD python3 app.py            │
└──────────────────────────────────────┘

⚠️ Why this matters
   Running as root inside a container means an attacker who breaks
   in gets full system access...

🔧 How to fix it
┌─ ✓ Fixed version ──────────────────────┐
│  RUN addgroup -S appgroup && \         │
│      adduser -S appuser -G appgroup    │
│  USER appuser                          │
└────────────────────────────────────────┘

📚 Learn more
   Study: Linux user permissions, principle of least privilege
```

**Field meanings:**
| Field | Meaning |
|-------|---------|
| Code (e.g. `DL3002`) | Rule ID — Google it for full official documentation |
| Tool badge | Which scanner found it |
| Line number | Which line in your file triggered the rule |
| Code snippet | The actual lines from your file (error line in red) |
| Why | The security risk this enables |
| Fix | Exact code to paste into your file |
| Learn more | Topics to study or direct link to the rule docs |

---

## 10. API Reference

All endpoints are available at `http://YOUR_VM_IP:8081/api/...`

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/ping` | — | Health check |
| GET | `/api/scan/health` | — | Which scanner tools are installed |
| GET | `/api/scan/history` | — | Last 10 scan results |
| POST | `/api/scan/docker` | `dockerfile` (file), `imageName` (text, optional) | Scan a Dockerfile |
| POST | `/api/scan/k8s` | `yamlFile` (file) | Scan a Kubernetes YAML |
| POST | `/api/scan/terraform` | `tfFiles` (one or more files) | Scan Terraform files |

### Example responses

**GET /api/scan/health**
```json
{
  "status": "all_ready",
  "message": "6/6 scanner tools installed",
  "tools": {
    "hadolint":   { "installed": true, "version": "Haskell Dockerfile Linter 2.x" },
    "trivy":      { "installed": true, "version": "Version: 0.x" },
    "tfsec":      { "installed": true, "version": "v1.x" },
    "checkov":    { "installed": true, "version": "3.x" },
    "kubeconform":{ "installed": true, "version": "v0.x" },
    "polaris":    { "installed": true, "version": "9.x" }
  }
}
```

**POST /api/scan/docker** (response shape)
```json
{
  "score": 40,
  "grade": "Critical Issues",
  "color": "red",
  "summary": { "CRITICAL": 0, "HIGH": 3, "MEDIUM": 4, "LOW": 2, "INFO": 0 },
  "findings": [
    {
      "code": "DL3002",
      "severity": "HIGH",
      "title": "Last USER should not be root",
      "message": "Last user should not be root",
      "line": 10,
      "tool": "hadolint",
      "why": "Running as root means...",
      "fix": "RUN addgroup -S appgroup...",
      "learnMore": "Study: Linux user permissions...",
      "codeSnippet": [
        { "lineNum": 9,  "content": "RUN pip3 install flask", "isError": false },
        { "lineNum": 10, "content": "USER root",              "isError": true  },
        { "lineNum": 11, "content": "CMD python3 app.py",     "isError": false }
      ]
    }
  ],
  "fileName": "bad.Dockerfile",
  "scannedAt": "2026-04-12T08:00:00.000Z"
}
```

### Test with curl
```bash
# Ping
curl http://localhost:8081/api/ping

# Tool health
curl http://localhost:8081/api/scan/health | python3 -m json.tool

# Scan a Dockerfile
curl -X POST http://localhost:8081/api/scan/docker \
  -F "dockerfile=@sample-files/bad.Dockerfile" | python3 -m json.tool

# Scan K8s YAML
curl -X POST http://localhost:8081/api/scan/k8s \
  -F "yamlFile=@sample-files/bad-deployment.yaml" | python3 -m json.tool

# Scan Terraform
curl -X POST http://localhost:8081/api/scan/terraform \
  -F "tfFiles=@sample-files/bad-main.tf" | python3 -m json.tool

# Scan Dockerfile + Trivy CVE scan
curl -X POST http://localhost:8081/api/scan/docker \
  -F "dockerfile=@sample-files/bad.Dockerfile" \
  -F "imageName=ubuntu:22.04" | python3 -m json.tool
```

---

## 11. Changing Your VM IP

### Direct mode
Edit `backend/.env`:
```
VM_IP=YOUR_NEW_IP
CORS_ORIGIN=http://YOUR_NEW_IP
```
Restart the backend.

### Docker mode
Edit the root `.env`:
```
VM_IP=YOUR_NEW_IP
```
Rebuild: `docker compose up --build -d`

---

## 12. Troubleshooting

### Ports used by this project

This project uses **only two ports**. Make sure both are open in your VM's firewall / NSG rules:

| Port | Service | Who uses it |
|------|---------|-------------|
| **80** | Frontend (React / nginx) | Your browser opens this |
| **8081** | Backend (Express API) | Frontend talks to this internally |

> **Azure / cloud VMs:** add inbound rules for port **80** and **8081** in your Network Security Group (NSG). No other ports are needed.

---

### Port permission denied (Error: EACCES port 80)

Linux blocks non-root processes from binding to ports below 1024 by default. Only port **80** (frontend) needs this fix — port **8081** (backend) works without any sysctl change.

```bash
# Fix immediately
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Make permanent — survives reboots
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.conf
```

---

### Port already in use

```bash
sudo fuser -k 80/tcp      # kill whatever is on port 80   (frontend)
sudo fuser -k 8081/tcp    # kill whatever is on port 8081  (backend)

# Alternative if fuser is not available:
kill $(lsof -t -i:80)   2>/dev/null || true
kill $(lsof -t -i:8081) 2>/dev/null || true
```

---

### Checkov not found / "ensurepip is not available" error

This happens on **Ubuntu 22.04+ / Debian 12+** with Python 3.12 because the `python3-venv` package alone is not enough — you also need the version-specific package:

```bash
# Install the correct venv package for Python 3.12
sudo apt-get install -y python3.12-venv python3-full

# Then re-run the installer
sudo bash install-tools.sh
```

**What the script does** (you don't need to do this manually):
- Creates a virtual environment at `/opt/checkov-venv`
- Installs Checkov inside it
- Symlinks `/usr/local/bin/checkov → /opt/checkov-venv/bin/checkov` so it works everywhere

**Why this is needed:** Python 3.12 enforces PEP 668, which blocks `pip install` to the system Python to prevent breaking OS packages. The venv approach is the correct permanent solution.

---

### CORS error in browser console

```
Access to XMLHttpRequest blocked by CORS policy
```

Fix: Update `VM_IP` and `CORS_ORIGIN` in `backend/.env` to match your current VM's public IP, then restart the backend.

```bash
nano backend/.env
# Change: VM_IP=YOUR_NEW_IP
# Change: CORS_ORIGIN=http://YOUR_NEW_IP
```

---

### Scanner shows `TOOL_MISSING`

```bash
# Check which tools are missing
curl http://localhost:8081/api/scan/health | python3 -m json.tool

# Re-run the installer (safe to run multiple times — skips already-installed tools)
sudo bash install-tools.sh
```

If only Checkov is missing, see the **"Checkov not found"** section above.

---

### npm: command not found

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

---

### Docker build fails

```bash
# Clear the build cache and try again
docker compose build --no-cache
docker compose up -d
```

If it fails on the Checkov/pip step inside Docker, the `backend/Dockerfile` already uses a venv — this should not happen unless the network is blocking PyPI. Try again; it's usually a transient network issue.

---

### Frontend shows blank page or cannot connect

1. Check the backend is alive: `curl http://localhost:8081/api/ping`
2. Check your browser URL uses the VM's IP, not `localhost` (unless you're on the VM itself)
3. In Docker mode: `docker compose ps` — both containers should show `healthy`
4. Check logs: `docker compose logs backend` or `docker compose logs frontend`

---

### Trivy scan is very slow (first time)

Trivy downloads its vulnerability database on first run (~100 MB). This is cached for subsequent runs.
Normal wait: **2–5 minutes** first time, a few seconds after that.

---

## 13. Project Structure

```
devops-test-suite/
├── .env                          ← master config (VM_IP, ports)
├── .gitignore
├── docker-compose.yml            ← production Docker setup
├── install-tools.sh              ← installs all 6 scanner tools (Linux/Mac)
├── README.md
├── WORKFLOW.md                   ← Windows→GitHub→Linux dev workflow
│
├── sample-files/                 ← test files for all 3 scan types
│   ├── bad.Dockerfile            ← many issues, low score
│   ├── good.Dockerfile           ← best practices, high score
│   ├── bad-deployment.yaml       ← K8s misconfigurations
│   ├── good-deployment.yaml      ← K8s best practices
│   ├── bad-main.tf               ← Terraform security issues
│   └── good-main.tf              ← secure Terraform
│
├── backend/
│   ├── Dockerfile                ← production image with scanner tools built in
│   ├── .dockerignore
│   ├── .env                      ← backend config (VM_IP, PORT, CORS)
│   ├── package.json
│   └── src/
│       ├── server.js             ← Express entry point (port 81)
│       ├── routes/
│       │   ├── scan.js           ← /history and /health endpoints
│       │   ├── docker.js         ← POST /api/scan/docker
│       │   ├── k8s.js            ← POST /api/scan/k8s
│       │   └── terraform.js      ← POST /api/scan/terraform
│       ├── scanners/
│       │   ├── hadolint.js       ← runs hadolint CLI, extracts code snippets
│       │   ├── trivy.js          ← runs trivy image/fs CLI
│       │   ├── tfsec.js          ← runs tfsec CLI, extracts code snippets
│       │   ├── checkov.js        ← runs checkov CLI, extracts code snippets
│       │   ├── kubeconform.js    ← runs kubeconform CLI
│       │   └── polaris.js        ← runs polaris audit CLI
│       ├── services/
│       │   ├── scoreEngine.js    ← calculates score 0-100 from findings
│       │   ├── historyStore.js   ← read/write scan-history.json
│       │   ├── explanations.js   ← enriches findings with why/fix/learnMore
│       │   └── codeExtractor.js  ← extracts code lines from uploaded files
│       └── data/
│           └── explanations.json ← 70+ rule explanations database
│
└── frontend/
    ├── Dockerfile                ← multi-stage: Vite build → nginx
    ├── .dockerignore
    ├── nginx.conf                ← nginx config with /api proxy to backend
    ├── package.json
    ├── vite.config.js            ← port 80, proxy /api→81, host 0.0.0.0
    ├── tailwind.config.js        ← dark GitHub-style theme
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── App.jsx               ← root component, all scan state
        ├── main.jsx              ← React entry point
        ├── index.css             ← Tailwind + custom animations
        ├── api/
        │   └── scanApi.js        ← axios wrappers for all API calls
        └── components/
            ├── Header.jsx        ← top nav with tool health indicator
            ├── EmptyState.jsx    ← SVG placeholder before first scan
            ├── OverallReportCard.jsx ← three score circles side-by-side
            ├── ScoreCircle.jsx   ← animated SVG donut chart
            ├── UploadZone.jsx    ← drag-and-drop file upload
            ├── ScanProgress.jsx  ← animated progress bar during scan
            ├── FindingsList.jsx  ← score header + filtered findings list
            ├── FindingItem.jsx   ← accordion: code snippet + why + fix
            ├── SeverityBadge.jsx ← CRITICAL/HIGH/MEDIUM/LOW/INFO badge
            └── HistoryPanel.jsx  ← slide-in history side panel
```

---

## Quick Command Reference

```bash
# ── Direct mode ────────────────────────────────────────────────
node -v && npm -v                         # check Node.js
sudo bash install-tools.sh               # install scanner tools
cd backend  && npm install && node src/server.js   # start backend
cd frontend && npm install && npm run dev           # start frontend
kill $(lsof -t -i:8081)                    # stop backend
kill $(lsof -t -i:80)                    # stop frontend

# ── Docker mode ─────────────────────────────────────────────────
docker compose up --build -d             # build and start
docker compose down                      # stop
docker compose logs -f                   # view logs
docker compose ps                        # check status

# ── Test API ────────────────────────────────────────────────────
curl http://localhost:8081/api/ping
curl http://localhost:8081/api/scan/health | python3 -m json.tool
curl http://localhost:8081/api/scan/history | python3 -m json.tool

# ── Scan via curl ───────────────────────────────────────────────
curl -X POST localhost:8081/api/scan/docker \
  -F "dockerfile=@sample-files/bad.Dockerfile" | python3 -m json.tool

curl -X POST localhost:8081/api/scan/k8s \
  -F "yamlFile=@sample-files/bad-deployment.yaml" | python3 -m json.tool

curl -X POST localhost:8081/api/scan/terraform \
  -F "tfFiles=@sample-files/bad-main.tf" | python3 -m json.tool
```
