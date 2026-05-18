# TTA Deployment Guide

**Project:** Trial Tracking App (TTA)
**Author:** Abhishek Anshuman
**Server:** 47.245.98.149 (Alibaba Cloud)
**Domain:** tta.indiakhelofootball.com

---

## Architecture Overview

```
Local (Windows 11)
├── D:\tta_frontend-main\          → Frontend (React)
│   └── tta_backend\               → Backend (Django 3.2)
│
Server (Linux - 47.245.98.149)
├── /root/TTA/frontend/ikf-tta-frontend/   → Frontend build files
├── /root/TTA/backend/ikf-tta-backend/     → Backend code (Git repo)
├── /root/TTA/backend/venv/                → Python 3.13 virtual env
├── Nginx                                  → Serves frontend + proxies API
└── Gunicorn (tta.sock)                    → Runs Django backend
```

**Key points:**
- Frontend and backend are **separate Git repos** pushed independently
- Frontend is built locally (Node.js 16) and uploaded as static files — **no Node.js on server**
- Backend is pushed to GitHub and pulled on server
- Server runs MariaDB 10.1.48, Django 3.2, Python 3.13

---

## Prerequisites

### Local machine
- Node.js 16+ (for `npm run build`)
- Git
- PuTTY installed (provides `pscp` and `plink` for file transfer)

### Server
- Python 3.13 with virtualenv
- Nginx
- Gunicorn
- MariaDB 10.1.48
- Git

---

## Step 1: Build Frontend Locally

```bash
cd D:\tta_frontend-main

# Ensure .env has the production API URL
# .env should contain:
# REACT_APP_API_URL=https://tta.indiakhelofootball.com/api

# Install dependencies (if not already done)
npm install

# Build production bundle
npm run build
```

This creates the `build/` folder with static HTML/CSS/JS files.
**No Node.js is needed on the server** — the build output is plain static files served by Nginx.

---

## Step 2: Upload Frontend Build to Server

Using `pscp` (PuTTY's SCP tool) to copy files directly from local to server.
**No GitHub involved — direct upload.**

```bash
# Upload build folder contents to server
pscp -pw "YOUR_PASSWORD" -r D:\tta_frontend-main\build\* root@47.245.98.149:/root/TTA/frontend/ikf-tta-frontend/build/
```

Or using `plink` + `pscp` from Git Bash:
```bash
powershell.exe -Command "echo y | pscp -pw 'YOUR_PASSWORD' -r 'D:/tta_frontend-main/build' root@47.245.98.149:/root/TTA/frontend/ikf-tta-frontend/"
```

### Verify upload
```bash
powershell.exe -Command "echo y | plink -ssh -pw 'YOUR_PASSWORD' root@47.245.98.149 'ls -la /root/TTA/frontend/ikf-tta-frontend/build/'"
```

Expected output:
```
index.html
asset-manifest.json
favicon.ico
static/
  css/
  js/
manifest.json
robots.txt
```

---

## Step 3: Push Backend Code to GitHub & Pull on Server

### From local machine
```bash
cd D:\tta_frontend-main\tta_backend
git add .
git commit -m "Your commit message"
git push origin main
```

### On server (via SSH or plink)
```bash
cd /root/TTA/backend/ikf-tta-backend
git pull origin main
```

---

## Step 4: Run Backend Migrations on Server

After pulling new backend code with model changes:

```bash
cd /root/TTA/backend/ikf-tta-backend/backend
source /root/TTA/backend/venv/bin/activate
python manage.py migrate
```

Or run specific app migrations:
```bash
python manage.py migrate vendors
python manage.py migrate trialcities
python manage.py migrate reps
```

---

## Step 5: Restart Gunicorn

After backend code changes:

```bash
sudo systemctl restart tta
```

Verify it's running:
```bash
sudo systemctl status tta
```

Expected: `Active: active (running)`

The gunicorn service config is at `/etc/systemd/system/tta.service`:
```ini
[Unit]
Description=gunicorn tta daemon
Requires=tta.socket
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/root/TTA/backend/ikf-tta-backend/backend
ExecStart=/root/TTA/backend/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/run/tta.sock \
          backend.wsgi:application

[Install]
WantedBy=multi-user.target
```

---

## Step 6: Nginx Configuration

Nginx config file: `/etc/nginx/sites-enabled/tta.indiakhelofootball.com`

```nginx
server{
    listen 80;
    server_name www.tta.indiakhelofootball.com tta.indiakhelofootball.com;
    return 301 https://tta.indiakhelofootball.com$request_uri;
}

server {
    listen 443;
    server_name www.tta.indiakhelofootball.com tta.indiakhelofootball.com;
    client_max_body_size 16M;

    # Serve React frontend build
    root /root/TTA/frontend/ikf-tta-frontend/build;
    index index.html;

    # React app — all routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Django backend
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/run/tta.sock;
    }

    # Proxy Django admin
    location /admin/ {
        include proxy_params;
        proxy_pass http://unix:/run/tta.sock;
    }

    # Serve Django admin static files
    location /static/admin/ {
        include proxy_params;
        proxy_pass http://unix:/run/tta.sock;
    }

    ssl on;
    ssl_certificate /etc/letsencrypt/live/indiakhelofootball.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/indiakhelofootball.com/privkey.pem;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
}
```

### How it works:
| URL Path | Handled by |
|----------|-----------|
| `/` (and all React routes) | Nginx serves `build/index.html` |
| `/api/*` | Proxied to Django via gunicorn socket |
| `/admin/*` | Proxied to Django admin |
| `/static/admin/*` | Django admin static files |

### After changing Nginx config:
```bash
# Test config syntax
sudo nginx -t

# Reload (no downtime)
sudo systemctl reload nginx
```

---

## Quick Deploy Checklist

### Frontend-only changes (UI/React code):
1. `npm run build` (local)
2. `pscp` build files to server
3. Done — Nginx serves new files immediately

### Backend-only changes (Django/API):
1. `git push` from local `tta_backend/`
2. `git pull` on server
3. `python manage.py migrate` (if model changes)
4. `sudo systemctl restart tta`

### Both frontend + backend:
1. Do backend steps first (push, pull, migrate, restart)
2. Then frontend steps (build, upload)

---

## Useful Commands Reference

### SSH into server
```bash
ssh root@47.245.98.149
# Or via plink:
plink -ssh -pw "YOUR_PASSWORD" root@47.245.98.149
```

### Upload a single file
```bash
pscp -pw "YOUR_PASSWORD" "D:/path/to/file" root@47.245.98.149:/server/path/
```

### Run a command on server remotely
```bash
powershell.exe -Command "echo y | plink -ssh -pw 'YOUR_PASSWORD' root@47.245.98.149 'your command here'"
```

### Check Django logs
```bash
sudo journalctl -u tta --no-pager -n 50
```

### Check Nginx logs
```bash
tail -50 /var/log/nginx/access.log
tail -50 /var/log/nginx/error.log
```

### Django shell on server
```bash
cd /root/TTA/backend/ikf-tta-backend/backend
source /root/TTA/backend/venv/bin/activate
python manage.py shell
```

### Check/change user roles
```python
from accounts.models import User
u = User.objects.get(email='user@example.com')
print(u.role)       # Check role
u.role = 'SUPER_ADMIN'  # SUPER_ADMIN, ADMIN, or REP
u.save()
```

---

## Server Details

| Item | Value |
|------|-------|
| IP | 47.245.98.149 |
| SSH Port | 22 |
| User | root |
| Domain | tta.indiakhelofootball.com |
| SSL | Let's Encrypt (shared with indiakhelofootball.com) |
| Python | 3.13 |
| Django | 3.2 |
| Database | MariaDB 10.1.48 |
| Gunicorn Socket | /run/tta.sock |
| Frontend Path | /root/TTA/frontend/ikf-tta-frontend/build/ |
| Backend Path | /root/TTA/backend/ikf-tta-backend/backend/ |
| Virtualenv | /root/TTA/backend/venv/ |

---

## Troubleshooting

### Frontend shows blank page
- Check browser console for errors
- Verify `build/index.html` exists on server
- Verify Nginx `root` points to correct build path
- Check `REACT_APP_API_URL` in `.env` before building

### API calls return 502
- Gunicorn is not running: `sudo systemctl restart tta`
- Check socket exists: `ls -la /run/tta.sock`

### API calls return 404
- Django URLs might not match — check `backend/urls.py`
- Ensure Nginx proxies `/api/` correctly

### Login works but sidebar is empty
- User role is not SUPER_ADMIN or ADMIN
- Fix via Django shell (see commands above)

### Build fails locally
- Check Node.js version (16+)
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Migration fails on server
- MariaDB 10.1 compatibility issue — Django 3.2 is required
- Check `.env` on server has correct DB credentials
