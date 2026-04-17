# CI/CD Pipeline Setup Guide

> Complete step-by-step guide to wire GitHub → Jenkins → DockerHub → VM deploy.
> No AKS, no az login, no Kubernetes — Jenkins and the app run on the **same VM**.

---

## How the pipeline works

```
You push code to GitHub
        │
        ▼  (webhook)
   Jenkins pulls code
        │
        ▼
   npm test (backend)
        │
        ▼
   docker build (frontend + backend)
        │
        ▼
   docker push → DockerHub
        │            (:build-N  for rollback history)
        │            (:latest   for deploy)
        ▼
   docker compose pull + up -d
   (on the SAME VM, /opt/devops-app)
        │
        ▼
   Health check → curl :80 and :8081
        │
        ▼
   Cleanup old images from disk
```

---

## Part 1 — One-time VM setup

Run these on your Linux VM once before the first build.

### 1.1 — Add Jenkins to the docker group

Jenkins runs as the `jenkins` user. It needs docker access without sudo:

```bash
sudo usermod -aG docker jenkins

# Restart Jenkins to apply the group change
sudo systemctl restart jenkins

# Verify (should show docker in the list)
groups jenkins
```

### 1.2 — Create the deploy directory

This is where the app runs permanently. Jenkins copies files here on every deploy:

```bash
sudo mkdir -p /opt/devops-app

# Give Jenkins write access
sudo chown -R jenkins:jenkins /opt/devops-app
```

### 1.3 — Create the backend .env in the deploy directory

Jenkins does NOT manage your secrets — you place them here once manually:

```bash
sudo nano /opt/devops-app/backend.env
```

Paste this content (replace the IP with your VM's actual IP):
```
PORT=8081
HOST=0.0.0.0
VM_IP=20.106.37.144
CORS_ORIGIN=http://20.106.37.144
NODE_ENV=production
UPLOAD_DIR=./uploads
HISTORY_FILE=./scan-history.json
MAX_FILE_SIZE_MB=10
```

> **Note:** The `docker-compose.yml` reads `./backend/.env` — we need to make sure
> it finds this file. The pipeline copies `docker-compose.yml` to `/opt/devops-app/`
> and the backend service has `env_file: ./backend/.env`. Create that path:

```bash
mkdir -p /opt/devops-app/backend
cp /opt/devops-app/backend.env /opt/devops-app/backend/.env
```

### 1.4 — Open firewall ports (Azure NSG)

Make sure these inbound rules exist in your Azure Network Security Group:

| Port | Protocol | Purpose |
|------|----------|---------|
| 80   | TCP      | Frontend (browser access) |
| 8081 | TCP      | Backend API |
| 8080 | TCP      | Jenkins dashboard |

---

## Part 2 — Jenkins configuration

Open Jenkins in your browser: `http://YOUR_VM_IP:8080`

### 2.1 — Add DockerHub credentials

Jenkins needs your DockerHub password to push images.

1. Go to **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
2. Fill in:
   - **Kind:** Username with password
   - **Username:** `virendranawkar` *(your DockerHub username)*
   - **Password:** your DockerHub password (or access token — see note below)
   - **ID:** `dockerhub-creds` ← **must match exactly**
   - **Description:** DockerHub credentials
3. Click **Save**

> **Use an Access Token, not your password:**
> DockerHub → Account Settings → Security → New Access Token → copy the token → paste as Password in Jenkins.
> Access tokens can be revoked without changing your password.

### 2.2 — Create the Pipeline job

1. Jenkins dashboard → **New Item**
2. Name: `devops-test-suite`
3. Type: **Pipeline** → OK
4. Under **General**: check ✅ **GitHub project**
   - URL: `https://github.com/Virendra-Nawkar/Devops-test`
5. Under **Build Triggers**: check ✅ **GitHub hook trigger for GITScm polling**
6. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/Virendra-Nawkar/Devops-test.git`
   - Branch: `*/main`
   - Script Path: `devops-test-suite/Jenkinsfile`
7. Click **Save**

### 2.3 — Test the pipeline manually first

Before setting up the webhook, run the pipeline manually once to confirm everything works:

1. Open the `devops-test-suite` job
2. Click **Build Now**
3. Click the build number → **Console Output**
4. Watch each stage complete — all should show ✔

---

## Part 3 — GitHub webhook

This makes Jenkins trigger automatically on every `git push`.

### 3.1 — Find your Jenkins webhook URL

```
http://YOUR_VM_IP:8080/github-webhook/
```

Example: `http://20.106.37.144:8080/github-webhook/`

### 3.2 — Add the webhook to GitHub

1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Fill in:
   - **Payload URL:** `http://YOUR_VM_IP:8080/github-webhook/`
   - **Content type:** `application/json`
   - **Which events:** Just the **push** event
3. Click **Add webhook**
4. GitHub will send a test ping — you should see a green tick ✅

### 3.3 — Test the webhook

```bash
# On your Windows machine, make a small change and push
git add .
git commit -m "test: trigger CI pipeline"
git push
```

Go back to Jenkins — within 5-10 seconds a new build should start automatically.

---

## Part 4 — Rolling back to a previous build

Every build pushes two tags to DockerHub:
- `virendranawkar/devops-backend:build-42` — exact snapshot
- `virendranawkar/devops-backend:latest` — always newest

To roll back to build 39 (for example):

```bash
cd /opt/devops-app

BACKEND_IMAGE=virendranawkar/devops-backend:build-39 \
FRONTEND_IMAGE=virendranawkar/devops-frontend:build-39 \
docker compose pull

BACKEND_IMAGE=virendranawkar/devops-backend:build-39 \
FRONTEND_IMAGE=virendranawkar/devops-frontend:build-39 \
docker compose up -d --force-recreate

echo "Rolled back to build 39"
```

---

## Part 5 — Useful Jenkins commands

```bash
# Check Jenkins service status
sudo systemctl status jenkins

# Restart Jenkins
sudo systemctl restart jenkins

# View Jenkins logs
sudo journalctl -u jenkins -f

# Check Jenkins is listening
sudo ss -tlnp | grep 8080
```

---

## Part 6 — Troubleshooting

### "Permission denied" when running docker in Jenkins

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### Pipeline fails at Push stage — "unauthorized"

- Check the credential ID is exactly `dockerhub-creds` (no spaces, case-sensitive)
- Regenerate your DockerHub access token and update the Jenkins credential

### Webhook not triggering Jenkins

- Confirm port 8080 is open in your NSG
- Go to GitHub → repo Settings → Webhooks → click the webhook → Recent Deliveries
- Check for error codes (301 = wrong URL, 403 = Jenkins CSRF, 404 = wrong path)
- For 403: Jenkins → Manage Jenkins → Security → uncheck "Enable proxy compatibility" or add GitHub to allowed hosts

### Health check fails — containers not starting

```bash
# Check container status
docker compose -f /opt/devops-app/docker-compose.yml ps

# View backend logs
docker compose -f /opt/devops-app/docker-compose.yml logs backend

# View frontend logs
docker compose -f /opt/devops-app/docker-compose.yml logs frontend
```

### Disk full after many builds

```bash
# See disk usage
df -h

# Remove all unused Docker objects
docker system prune -af --volumes

# See how much space images use
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

---

## Quick reference

| What | Where |
|------|-------|
| Jenkins UI | `http://YOUR_VM_IP:8080` |
| App (browser) | `http://YOUR_VM_IP:80` |
| API | `http://YOUR_VM_IP:8081/api/ping` |
| DockerHub images | `hub.docker.com/u/virendranawkar` |
| Deploy directory | `/opt/devops-app/` |
| Backend config | `/opt/devops-app/backend/.env` |
| Jenkins logs | `sudo journalctl -u jenkins -f` |
| Container logs | `docker compose -f /opt/devops-app/docker-compose.yml logs -f` |
