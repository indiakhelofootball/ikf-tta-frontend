#!/bin/bash
# ============================================
# TTA FRONTEND Deployment Script
# Repo: ikf-tta-frontend
# Domain: tta.indiakhelofootball.com
# Run as root or with sudo on your VPS
# Usage: sudo bash deploy.sh
#
# PREREQUISITE: Backend must be deployed first
#   (tta-backend service running on port 8020)
# ============================================

set -e

# ============================================
# CONFIGURATION
# ============================================
DOMAIN="tta.indiakhelofootball.com"
FRONTEND_REPO="https://github.com/indiakhelofootball/ikf-tta-frontend.git"
DEPLOY_DIR="/var/www/tta-frontend"
BACKEND_DJANGO_DIR="/var/www/tta-backend/backend"
GUNICORN_PORT=8020
SERVER_USER="www-data"

echo "=========================================="
echo "  TTA Frontend Deployment"
echo "  Domain: $DOMAIN"
echo "=========================================="

# ============================================
# 1. SYSTEM PACKAGES
# ============================================
echo "[1/5] Checking system packages..."
apt update -y
apt install -y nginx curl git

# Install Node.js 18 LTS if not present
if ! command -v node &>/dev/null; then
    echo "  Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

echo "  Node.js $(node -v) / npm $(npm -v)"

# ============================================
# 2. CLONE / PULL FRONTEND REPO
# ============================================
echo "[2/5] Setting up frontend code..."
if [ -d "$DEPLOY_DIR/.git" ]; then
    echo "  Repo exists, pulling latest..."
    cd "$DEPLOY_DIR"
    git pull origin main
else
    echo "  Cloning frontend repo..."
    git clone "$FRONTEND_REPO" "$DEPLOY_DIR"
fi

# ============================================
# 3. BUILD REACT APP
# ============================================
echo "[3/5] Building React frontend..."
cd "$DEPLOY_DIR"

export REACT_APP_API_URL=https://$DOMAIN/api
export GENERATE_SOURCEMAP=false

npm install
npm run build

echo "  React build complete: $DEPLOY_DIR/build/"

# ============================================
# 4. NGINX CONFIGURATION
# ============================================
echo "[4/5] Setting up Nginx..."
cat > /etc/nginx/sites-available/tta <<'NGINX_EOF'
server {
    listen 80;
    server_name tta.indiakhelofootball.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name tta.indiakhelofootball.com;

    # SSL - Update these paths to your actual certificate locations
    # If using Let's Encrypt / Certbot, they are typically at:
    ssl_certificate     /etc/letsencrypt/live/tta.indiakhelofootball.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tta.indiakhelofootball.com/privkey.pem;

    # React frontend (static build)
    root /var/www/tta-frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # API requests → Django/Gunicorn backend
    location /api/ {
        proxy_pass http://127.0.0.1:8020;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
    }

    # Health check → Backend
    location /health/ {
        proxy_pass http://127.0.0.1:8020;
        proxy_set_header Host $host;
    }

    # Django admin panel
    location /admin/ {
        proxy_pass http://127.0.0.1:8020;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django static files (admin CSS/JS)
    location /static/ {
        alias /var/www/tta-backend/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets (JS, CSS, images)
    location /static/js/ {
        root /var/www/tta-frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /static/css/ {
        root /var/www/tta-frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /static/media/ {
        root /var/www/tta-frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React SPA — all other routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX_EOF

# Enable site
ln -sf /etc/nginx/sites-available/tta /etc/nginx/sites-enabled/tta

# ============================================
# 5. SSL CERTIFICATE
# ============================================
echo "[5/5] Setting up SSL..."

# Check if cert already exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "  SSL certificate already exists."
else
    echo "  Getting SSL certificate via Certbot..."
    if command -v certbot &>/dev/null; then
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email tech.ikf@indiakhelofootball.com
    else
        echo "  ⚠️  Certbot not found. Install it:"
        echo "     sudo apt install certbot python3-certbot-nginx"
        echo "     sudo certbot --nginx -d $DOMAIN"
        echo ""
        echo "  Or update SSL paths in /etc/nginx/sites-available/tta"
    fi
fi

# Test and restart Nginx
nginx -t
systemctl reload nginx

# Set permissions
chown -R $SERVER_USER:$SERVER_USER "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"

echo ""
echo "=========================================="
echo "  FRONTEND DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "  Frontend: https://$DOMAIN/"
echo "  Backend:  https://$DOMAIN/api/"
echo "  Admin:    https://$DOMAIN/admin/"
echo "  Health:   https://$DOMAIN/health/"
echo ""
echo "  Commands:"
echo "    sudo nginx -t                        # Test nginx config"
echo "    sudo systemctl reload nginx          # Reload nginx"
echo "    sudo systemctl status tta-backend    # Check backend"
echo "    sudo systemctl restart tta-backend   # Restart backend"
echo ""
echo "  To rebuild frontend after code changes:"
echo "    cd $DEPLOY_DIR && git pull origin main"
echo "    REACT_APP_API_URL=https://$DOMAIN/api GENERATE_SOURCEMAP=false npm run build"
echo "    # No nginx restart needed - it serves static files"
echo ""
echo "  To update backend after code changes:"
echo "    cd /var/www/tta-backend && git pull origin main"
echo "    source venv/bin/activate && cd backend"
echo "    pip install -r ../requirements.txt"
echo "    python manage.py migrate"
echo "    sudo systemctl restart tta-backend"
echo ""
