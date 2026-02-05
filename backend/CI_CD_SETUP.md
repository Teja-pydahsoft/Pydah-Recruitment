# Backend CI/CD – GitHub to AWS Lightsail

This guide explains how to connect your GitHub repo to your AWS Lightsail instance so that every push to `main` (with backend changes) automatically deploys.

---

## Where the workflow lives

- **Workflow file:** `.github/workflows/backend-deploy.yml` (at the **repository root**, not inside `backend/`).
- **Trigger:** Pushes to `main` that touch `backend/**`, or the "Run workflow" button in the Actions tab.

---

## Required GitHub secrets (env variables for the connection)

Add these in your repo: **Settings → Secrets and variables → Actions → New repository secret.**

| Secret name | Required | Description |
|-------------|----------|-------------|
| `LIGHTSAIL_HOST` | **Yes** | Public IP or hostname of your Lightsail instance (e.g. `3.12.34.56` or `my-instance.us-east-1.cs.amazonlightsail.com`). |
| `LIGHTSAIL_USER` | **Yes** | SSH user on the instance. Usually `ubuntu` (Ubuntu) or `ec2-user` (Amazon Linux). |
| `LIGHTSAIL_SSH_KEY` | **Yes** | **Full private key** (PEM) that you use to SSH into the instance. Include `-----BEGIN ... KEY-----` and `-----END ... KEY-----`. |
| `LIGHTSAIL_APP_PATH` | **Yes** | Absolute path on the instance where the repo is cloned (e.g. `/home/ubuntu/Pydah-Recruitment`). |
| `LIGHTSAIL_SSH_PORT` | No | SSH port if not 22. Omit for default 22. |

---

## Step-by-step setup

### 1. Get your Lightsail instance details

- In **AWS Lightsail** → your instance → **Account** (or **Connect**): note the **public IP** and **SSH user**.
- Download the default SSH key (or use your own). You need the **private** key for `LIGHTSAIL_SSH_KEY`.

### 2. Prepare the instance (one-time)

SSH into the instance and run:

```bash
# Install Node 18 (if not already)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs   # Ubuntu
# Or use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash && nvm install 18

# Install git
sudo apt-get update && sudo apt-get install -y git

# Clone the repo (replace with your repo URL; use HTTPS or add deploy key)
cd ~
git clone https://github.com/YOUR_ORG/Pydah-Recruitment.git
cd Pydah-Recruitment/backend
npm ci --only=production
```

Set **`LIGHTSAIL_APP_PATH`** to the folder that contains both repo and `backend`, e.g. `/home/ubuntu/Pydah-Recruitment`.

### 3. Run the backend on the instance (PM2 or systemd)

**Option A – PM2 (simple):**

```bash
sudo npm install -g pm2
cd /home/ubuntu/Pydah-Recruitment/backend
pm2 start server.js --name pydah-backend
pm2 save
pm2 startup   # run the command it prints so PM2 starts on reboot
```

**Option B – systemd:**  
Create `/etc/systemd/system/pydah-backend.service` (adjust paths and user):

```ini
[Unit]
Description=Pydah Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Pydah-Recruitment/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/home/ubuntu/Pydah-Recruitment/backend/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pydah-backend
sudo systemctl start pydah-backend
```

### 4. Allow GitHub to pull (HTTPS or SSH)

- **HTTPS:** On the instance, run `git config --global credential.helper store` and once do a `git pull` with a **Personal Access Token** (repo scope) as password; or use a **deploy key** (read-only) and clone/pull via SSH.
- **SSH (recommended):** On the instance, generate a deploy key, add the **public** key to the repo as a deploy key (read-only), and change the remote to SSH:
  `git remote set-url origin git@github.com:YOUR_ORG/Pydah-Recruitment.git`

### 5. Add GitHub Actions secrets

In the repo: **Settings → Secrets and variables → Actions → New repository secret** for each:

- `LIGHTSAIL_HOST` = instance IP or hostname  
- `LIGHTSAIL_USER` = e.g. `ubuntu`  
- `LIGHTSAIL_SSH_KEY` = full private key (PEM)  
- `LIGHTSAIL_APP_PATH` = e.g. `/home/ubuntu/Pydah-Recruitment`  
- `LIGHTSAIL_SSH_PORT` = only if SSH is not on 22  

### 6. Run a deploy

- Push to `main` with changes under `backend/`, or  
- Go to **Actions → "Backend Deploy to Lightsail" → Run workflow**.

---

## Summary: env variables to connect repo to instance

| Purpose | Where to set | Name | Example |
|--------|----------------|------|--------|
| Instance address | GitHub Secrets | `LIGHTSAIL_HOST` | `3.12.34.56` |
| SSH user | GitHub Secrets | `LIGHTSAIL_USER` | `ubuntu` |
| SSH auth | GitHub Secrets | `LIGHTSAIL_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----...` |
| Repo path on server | GitHub Secrets | `LIGHTSAIL_APP_PATH` | `/home/ubuntu/Pydah-Recruitment` |
| SSH port (optional) | GitHub Secrets | `LIGHTSAIL_SSH_PORT` | `22` |

Your app’s own env (e.g. `MONGODB_URI`, `JWT_SECRET`) stays in `.env` on the Lightsail instance; the workflow only needs the five entries above (four required + one optional port) to connect the repo to the instance.
