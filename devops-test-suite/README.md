# DevOps Test Suite

A unified **Infrastructure Security Dashboard** for DevOps learners. Upload Dockerfiles, Kubernetes YAML, and Terraform files to get instant security scores with plain-English explanations and concrete fixes.

---

## What This Does

| Upload | Tool(s) Used | What You Learn |
|--------|-------------|----------------|
| Dockerfile | Hadolint + Trivy | Best practices, CVEs |
| Kubernetes YAML | Kubeconform + Polaris | Schema errors, best practices |
| Terraform `.tf` files | tfsec + Checkov | Security misconfigurations |

Every finding includes:
- **Why it matters** — plain English, no jargon
- **How to fix it** — exact code to copy-paste
- **Learn more** — topics to study

---

## How It Works

```
Browser (port 80)
    │  uploads file
    ▼
React Frontend (Vite, port 80)
    │  POST /api/scan/...
    ▼
Node.js Backend (Express, port 81)
    │  runs CLI tools
    ├─ hadolint → parse JSON → enrich with explanations.json
    ├─ trivy    → parse JSON → merge findings
    ├─ tfsec    → parse JSON → enrich
    ├─ checkov  → parse JSON → deduplicate
    ├─ kubeconform → parse JSONL
    └─ polaris  → parse JSON → score engine
    │
    ▼
Score (0-100) + Grade + Findings list
    │
    ▼
Response JSON → displayed in dashboard
```

---

## Prerequisites

Install these on your **Linux VM or Mac** before running the project:

| Tool | Why needed |
|------|-----------|
| Node.js 20+ | Runs the backend and frontend |
| npm | Installs Node dependencies |
| Python3 + pip3 | Required for Checkov |
| curl / wget | Used by install-tools.sh |
| git | To clone and pull the repo |

**Install Node.js 20 on Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Setup — Step by Step

### Step 1: Clone the repository
```bash
git clone https://github.com/Virendra-Nawkar/Devops-test.git
cd Devops-test/devops-test-suite
```

### Step 2: Install scanner tools (one-time)
```bash
bash install-tools.sh
```
This installs: Hadolint, Trivy, tfsec, Checkov, Kubeconform, Polaris.
Takes 2-5 minutes. Run as root on Linux (`sudo bash install-tools.sh`).

### Step 3: Start the backend
```bash
cd backend
npm install
node src/server.js
```
Backend runs on **port 81**. You should see the startup banner.

### Step 4: Start the frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **port 80**.

### Step 5: Open the dashboard
```
http://20.12.224.28:80        ← from your Windows browser (VM IP)
http://localhost:80           ← if running locally
```

---

## How to Test with Sample Files

The `sample-files/` folder contains ready-made test files:

| File | Expected Score | Use to test |
|------|---------------|-------------|
| `bad.Dockerfile` | ~40 | Many Dockerfile issues |
| `good.Dockerfile` | ~95 | Well-written Dockerfile |
| `bad-deployment.yaml` | ~30 | Many K8s misconfigurations |
| `good-deployment.yaml` | ~95 | Well-configured K8s |
| `bad-main.tf` | ~20 | Many Terraform issues |
| `good-main.tf` | ~90 | Secure Terraform |

**Try it:**
1. Click the **Dockerfile** tab
2. Drop `sample-files/bad.Dockerfile` into the upload zone
3. Click **Scan Dockerfile**
4. See the score and click each finding to expand the explanation

---

## Scanner Tools Explained

### Hadolint
- **What:** Lints Dockerfiles for best practice violations
- **Checks:** Root user, pinned versions, HEALTHCHECK, CMD form
- **Docs:** https://github.com/hadolint/hadolint

### Trivy
- **What:** Scans Docker images for known CVEs (vulnerabilities)
- **Database:** Uses the NVD, GitHub Advisory, and OS vendor databases
- **Docs:** https://github.com/aquasecurity/trivy

### tfsec
- **What:** Static analysis of Terraform code for security issues
- **Checks:** Open security groups, unencrypted storage, public IPs
- **Docs:** https://github.com/aquasecurity/tfsec

### Checkov
- **What:** Policy-as-code framework for Terraform, K8s, and more
- **Checks:** CKV_ rule IDs covering hundreds of compliance rules
- **Docs:** https://www.checkov.io/

### Kubeconform
- **What:** Validates Kubernetes YAML against the official API schema
- **Checks:** Correct field names, required fields, API version
- **Docs:** https://github.com/yannh/kubeconform

### Polaris
- **What:** Audits Kubernetes workloads for best practices
- **Checks:** Probes, resource limits, security context, capabilities
- **Docs:** https://polaris.docs.fairwinds.com/

---

## How Scoring Works

Start at **100 points**. Each finding deducts:

| Severity | Deduction |
|----------|-----------|
| CRITICAL | -20 |
| HIGH     | -10 |
| MEDIUM   | -5  |
| LOW      | -2  |
| INFO     | 0   |

Minimum score: **0** (never goes negative).

| Score | Grade |
|-------|-------|
| 90-100 | Excellent |
| 70-89  | Good |
| 50-69  | Needs Work |
| 0-49   | Critical Issues |

---

## Changing Your VM IP

If you deploy to a different server, update **`backend/.env`**:
```
VM_IP=YOUR_NEW_IP
CORS_ORIGIN=http://YOUR_NEW_IP
```
Then restart the backend.

---

## API Reference

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/ping` | Health check |
| GET | `/api/scan/health` | Check which tools are installed |
| GET | `/api/scan/history` | Last 10 scan results |
| POST | `/api/scan/docker` | Scan a Dockerfile |
| POST | `/api/scan/k8s` | Scan a Kubernetes YAML |
| POST | `/api/scan/terraform` | Scan Terraform files |

---

## Troubleshooting

**Backend won't start: `EADDRINUSE: port 81`**
```bash
kill $(lsof -t -i:81)
```

**Frontend won't start: `EADDRINUSE: port 80`**
```bash
# Port 80 needs root on Linux — run with sudo
sudo npm run dev
# Or change port in vite.config.js to 8080
```

**"CORS error" in browser console**
Edit `backend/.env`:
```
CORS_ORIGIN=http://YOUR_VM_IP
```
Restart the backend.

**Scanner shows "TOOL_MISSING" finding**
Run `bash install-tools.sh` to install missing tools. Check with:
```bash
curl http://localhost:81/api/scan/health
```

**Checkov not found after pip3 install**
```bash
# Add pip user bin to PATH
export PATH=$PATH:$HOME/.local/bin
echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
```

**Port 80 access denied on Linux**
```bash
# Allow Node.js to bind to ports < 1024 without root
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

---

## Project Structure

```
devops-test-suite/
├── install-tools.sh          ← installs scanner tools (Linux/Mac)
├── .env                      ← VM IP and port config
├── .gitignore
├── README.md
├── WORKFLOW.md               ← Windows → GitHub → Linux workflow guide
├── sample-files/             ← test files for all three scan types
│   ├── bad.Dockerfile
│   ├── good.Dockerfile
│   ├── bad-deployment.yaml
│   ├── good-deployment.yaml
│   ├── bad-main.tf
│   └── good-main.tf
├── frontend/                 ← React 18 + Vite + Tailwind (port 80)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── api/scanApi.js
│       └── components/
└── backend/                  ← Node.js + Express (port 81)
    ├── package.json
    ├── .env
    └── src/
        ├── server.js
        ├── routes/
        ├── scanners/
        ├── services/
        └── data/explanations.json
```
