#!/usr/bin/env bash
# Stand up the CSR stack from csr-foundation on SQLite, seed it, and run the
# Playwright operator suite. Designed for a throwaway Linux box (CI or sandbox).
#
#   FRONTEND_SRC=/path/to/tta_frontend-main \
#   BACKEND_SRC=/path/to/tta_frontend-main/tta_backend \
#   bash scripts/bootstrap.sh
#
# Everything is built in a scratch WORKDIR; your real repos are only read (cloned).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="${WORKDIR:-/tmp/csr-e2e-run}"
FRONTEND_SRC="${FRONTEND_SRC:?set FRONTEND_SRC to the frontend repo path}"
BACKEND_SRC="${BACKEND_SRC:?set BACKEND_SRC to the backend repo path}"
BRANCH="${BRANCH:-csr-foundation}"
API_PORT=8000
WEB_PORT=3000

mkdir -p "$WORKDIR"
echo "== 1/6 clone + checkout $BRANCH =="
rm -rf "$WORKDIR/fe" "$WORKDIR/be"
git clone --quiet "$FRONTEND_SRC" "$WORKDIR/fe" && git -C "$WORKDIR/fe" checkout --quiet "$BRANCH"
git clone --quiet "$BACKEND_SRC"  "$WORKDIR/be" && git -C "$WORKDIR/be" checkout --quiet "$BRANCH"

echo "== 2/6 backend venv + deps (skip mysqlclient; SQLite) =="
python3 -m venv "$WORKDIR/venv"
. "$WORKDIR/venv/bin/activate"
grep -viE '^mysqlclient' "$WORKDIR/be/backend/requirements.txt" > "$WORKDIR/req.txt"
pip install --quiet --upgrade pip
pip install --quiet -r "$WORKDIR/req.txt"

echo "== 3/6 migrate + seed =="
export DEBUG=True
export DB_ENGINE=django.db.backends.sqlite3
export DB_NAME="$WORKDIR/e2e.sqlite3"
export ALLOWED_HOSTS=localhost,127.0.0.1
export CORS_ALLOW_ALL_ORIGINS=True
export CORS_ORIGIN_ALLOW_ALL=True
cd "$WORKDIR/be/backend"
python manage.py migrate --noinput
python manage.py seed_csr_demo
nohup python manage.py runserver "$API_PORT" > "$WORKDIR/backend.log" 2>&1 &
echo $! > "$WORKDIR/backend.pid"

echo "== 4/6 frontend build =="
cd "$WORKDIR/fe"
npm install --no-audit --no-fund --loglevel=error
echo "REACT_APP_API_URL=http://localhost:$API_PORT/api" > .env.local
CI=false npm run build
nohup npx --yes serve -s build -l "$WEB_PORT" > "$WORKDIR/frontend.log" 2>&1 &
echo $! > "$WORKDIR/frontend.pid"

echo "== 5/6 wait for servers =="
for i in $(seq 1 60); do curl -sf "http://localhost:$API_PORT/api/" >/dev/null 2>&1 && break || sleep 2; done
for i in $(seq 1 60); do curl -sf "http://localhost:$WEB_PORT/" >/dev/null 2>&1 && break || sleep 2; done

echo "== 6/6 run Playwright =="
cd "$HERE"
npm install --no-audit --no-fund --loglevel=error
npx playwright install --with-deps chromium
BASE_URL="http://localhost:$WEB_PORT" npx playwright test

echo "Done. Report in $HERE/playwright-report. Logs in $WORKDIR/*.log"
