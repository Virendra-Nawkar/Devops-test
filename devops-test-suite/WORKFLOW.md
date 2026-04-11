# Windows → GitHub → Linux VM Workflow

This guide explains the exact workflow for developing on Windows and running on your Linux VM (IP: `20.12.224.28`).

---

## How It Works

```
Your Windows PC (VS Code)
        │
        │  git push
        ▼
    GitHub repo
        │
        │  git pull
        ▼
  Linux VM / Mac
  (runs the app)
        │
   ┌────┴────┐
   │         │
Backend   Frontend
Port 81   Port 80
```

You **write code on Windows**. You **run it on your Linux VM or Mac**.

---

## Step-by-Step Daily Workflow

### On Windows (VS Code)

**1. Edit code**
Open the project in VS Code. Make your changes.

**2. Push to GitHub**
Open Git Bash or the VS Code terminal:
```bash
git add .
git commit -m "describe what you changed"
git push
```

---

### On Linux VM (via SSH)

SSH into your VM first:
```bash
ssh your-user@20.12.224.28
```

**3. Pull the latest code**
```bash
cd ~/devops-test-suite
git pull
```

**4. First-time setup only: install scanner tools**
```bash
bash install-tools.sh
```

**5. Start the backend** (Terminal window 1)
```bash
cd backend
npm install
node src/server.js
```
You should see:
```
Listening on  http://0.0.0.0:81
VM access at  http://20.12.224.28:81
```

**6. Start the frontend** (Terminal window 2 — open a new SSH session or use tmux)
```bash
cd frontend
npm install
npm run dev
```
You should see:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:80/
  ➜  Network: http://20.12.224.28:80/
```

**7. Open the dashboard in your Windows browser**
```
http://20.12.224.28:80
```

---

## Running Both in the Background with tmux

If you want both processes to keep running after you close the SSH session:

```bash
# Install tmux if not already installed
sudo apt-get install -y tmux

# Create a new tmux session
tmux new-session -d -s devops

# Window 1: backend
tmux send-keys -t devops "cd ~/devops-test-suite/backend && npm install && node src/server.js" Enter

# Window 2: frontend
tmux new-window -t devops
tmux send-keys -t devops "cd ~/devops-test-suite/frontend && npm install && npm run dev" Enter

# Attach to see both
tmux attach -t devops
```

To detach from tmux without stopping the processes: press `Ctrl+B`, then `D`.

---

## Stopping the Servers

### If running in the foreground:
Press `Ctrl+C` in the terminal.

### If running in the background:
```bash
# Find and kill the backend (port 81)
kill $(lsof -t -i:81)

# Find and kill the frontend (port 80)
kill $(lsof -t -i:80)

# Or kill both with one command
pkill -f "node src/server.js"
pkill -f "vite"
```

### Kill the tmux session entirely:
```bash
tmux kill-session -t devops
```

---

## Viewing Logs

### Backend logs (if running in background)
```bash
# Redirect output to a log file
node src/server.js > backend.log 2>&1 &

# Tail the log
tail -f backend.log
```

### Frontend logs
Vite prints all requests to the terminal window. For background mode:
```bash
npm run dev > frontend.log 2>&1 &
tail -f frontend.log
```

---

## Changing Your VM IP

If you switch to a different VM, update **two files**:

1. **`backend/.env`** — change `VM_IP` and `CORS_ORIGIN`:
   ```
   VM_IP=YOUR_NEW_IP
   CORS_ORIGIN=http://YOUR_NEW_IP
   ```

2. **Root `.env`** — update `VM_IP` there too (for documentation):
   ```
   VM_IP=YOUR_NEW_IP
   ```

Then restart both servers.

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Pull latest code | `git pull` |
| Install scanner tools | `bash install-tools.sh` |
| Start backend | `cd backend && npm install && node src/server.js` |
| Start frontend | `cd frontend && npm install && npm run dev` |
| Check tool health | `curl http://localhost:81/api/scan/health` |
| View scan history | `curl http://localhost:81/api/scan/history` |
| Kill backend | `kill $(lsof -t -i:81)` |
| Kill frontend | `kill $(lsof -t -i:80)` |
| View backend port | `lsof -i:81` |

---

## Troubleshooting

**"EADDRINUSE: port 81 already in use"**
```bash
kill $(lsof -t -i:81)
```

**"CORS error" in browser**
Update `VM_IP` in `backend/.env` to match your current VM IP, then restart the backend.

**"npm: command not found"**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Frontend shows blank page**
Make sure the backend is running first (port 81), then refresh.
