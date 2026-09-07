#!/usr/bin/env bash
#
# TTA deploy — bundle both repos, replace the source on the server, rebuild.
#
# Run from Git Bash on Windows, from the frontend repo root:
#
#     TTA_DEPLOY_PASS='<root password>' _docs/deployment/deploy.sh
#     TTA_DEPLOY_PASS='...' _docs/deployment/deploy.sh --dry-run
#
# ---------------------------------------------------------------------------
# WHY THIS SCRIPT EXISTS
#
# On 2026-09-05 a deploy silently removed a week of CSR UI work that was
# already live. Nothing failed. The mechanism:
#
#   - `/root/tta` is not a git repo, so the server has no history and cannot
#     tell that incoming code is OLDER than what it already runs.
#   - the deploy was `tar -x` over the live tree, which overwrites and adds but
#     never deletes, so two branches merged into one directory on disk.
#   - the bundle was built from a branch cut before the CSR work and never
#     merged with main, so its App.js had no routes to the new pages.
#   - the leftover files from the good deploy stayed on disk, so every
#     "are the new files there?" check passed while the app was wrong.
#
# Three properties below make that impossible rather than unlikely.
#
#   1. THE BRANCH GATE. A bundle cannot be built from a commit that does not
#      contain origin/main. This alone would have refused the 5 Sep deploy.
#   2. CLEAN REPLACE. src/ and backend/ are deleted and re-extracted, so the
#      tree on the server is exactly one commit and can never be a blend of
#      two. Runtime state (.env) is preserved explicitly.
#   3. RELEASE STAMP. public/release.txt records the commits and is served at
#      https://<host>/release.txt, so "what is live?" is one curl, forever.
#
# A release directory plus a `current` symlink would be the more usual shape,
# but Docker does not follow symlinks out of a build context and the compose
# file builds the frontend from `.` and the backend from `./tta_backend`. A
# clean replace in place gives the same guarantee without touching compose.
# ---------------------------------------------------------------------------

set -euo pipefail

HOST="${TTA_DEPLOY_HOST:-47.237.115.74}"
USER_="root"
REMOTE="/root/tta"
FE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BE_ROOT="$FE_ROOT/tta_backend"
PLINK="/c/Program Files/PuTTY/plink"
PSCP="/c/Program Files/PuTTY/pscp"
STAMP="$(date +%Y-%m-%d-%H%M)"
WORK="$(mktemp -d)"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

trap 'rm -rf "$WORK"' EXIT

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
info() { printf '   %s\n' "$*"; }
die()  { printf '\n\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

rsh() { "$PLINK" -batch -pw "$TTA_DEPLOY_PASS" "$USER_@$HOST" "$@"; }

: "${TTA_DEPLOY_PASS:?set TTA_DEPLOY_PASS to the server root password}"
[ -x "$PLINK" ] || die "plink not found at $PLINK"

# ---------------------------------------------------------------------------
# 1. PREFLIGHT — refuse a bundle that would move production backwards
# ---------------------------------------------------------------------------
say "Preflight"

check_repo() {
  local root="$1" name="$2"
  cd "$root"

  git rev-parse --git-dir >/dev/null 2>&1 || die "$name: not a git repo"

  # Uncommitted changes to tracked files would ship code that exists in no
  # commit, which is how the deployed App.js came to match nothing at all.
  if ! git diff --quiet HEAD -- src backend 2>/dev/null; then
    die "$name: uncommitted changes to tracked source. Commit or stash first."
  fi

  # THE GATE. Everything on origin/main must already be in what we ship.
  git fetch origin main --quiet 2>/dev/null || info "$name: fetch failed, using cached origin/main"
  if ! git merge-base --is-ancestor origin/main HEAD; then
    local behind
    behind=$(git rev-list --count HEAD..origin/main)
    die "$name: HEAD is missing $behind commit(s) from origin/main.
       Deploying it would REMOVE work that is already live.
       Fix: git merge origin/main"
  fi
  info "$name: $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD) — contains origin/main"
}

check_repo "$FE_ROOT" "frontend"
check_repo "$BE_ROOT" "backend"

# THE GATE THAT MATTERS MOST: what is LIVE must be contained in what we ship.
#
# The origin/main check above is necessary but not sufficient. On 2026-09-05 a
# deploy destroyed a week of live CSR work, and origin/main alone would not
# necessarily have caught it: production can be running a commit that was never
# merged to main (it is, right now — deploy branches ship before they merge).
# The only authority on what must not be lost is the RUNNING SERVER, and since
# /release.txt exists it can be asked directly.
say "Live-version check (what is on the server must be contained in what we ship)"
LIVE=$(curl -s -m 30 "https://tta.indiakhelofootball.com/release.txt" || true)
if [ -z "$LIVE" ]; then
  info "WARNING: could not read /release.txt from production."
  info "         Either this predates the release stamp, or the site is down."
  info "         Proceeding WITHOUT the strongest guard — verify by hand what is live."
else
  LIVE_FE=$(echo "$LIVE" | awk '/^frontend /{print $2}')
  LIVE_BE=$(echo "$LIVE" | awk '/^backend /{print $2}')
  check_contains() {
    local root="$1" live="$2" name="$3"
    [ -n "$live" ] || { info "$name: release.txt names no commit; skipping"; return; }
    cd "$root"
    if ! git cat-file -e "${live}^{commit}" 2>/dev/null; then
      die "$name: production runs $live, which does not exist in this repo.
       Someone deployed from another machine or another branch. Fetch it and
       merge it before deploying, or you will destroy whatever it contains."
    fi
    if ! git merge-base --is-ancestor "$live" HEAD; then
      die "$name: production runs ${live:0:7}, and it is NOT contained in
       $(git rev-parse --short HEAD). Deploying would REMOVE work that is
       live right now — this is exactly the 2026-09-05 CSR failure.
       Fix: git merge $live"
    fi
    info "$name: live ${live:0:7} is contained in $(git rev-parse --short HEAD)"
  }
  check_contains "$FE_ROOT" "$LIVE_FE" "frontend"
  check_contains "$BE_ROOT" "$LIVE_BE" "backend"
  cd "$FE_ROOT"
fi

cd "$FE_ROOT"; FE_SHA=$(git rev-parse HEAD); FE_SHORT=${FE_SHA:0:7}
FE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
cd "$BE_ROOT"; BE_SHA=$(git rev-parse HEAD); BE_SHORT=${BE_SHA:0:7}
BE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
cd "$FE_ROOT"

# Infra files carry fixes made on the box that were never committed (the July
# cross-bridge `dbbridge` network, the static volume path). We never ship them,
# but if git has changed them the operator must decide before, not discover after.
say "Infrastructure drift check"
for f in docker-compose.yml nginx.conf Dockerfile package.json; do
  if [ -f "$f" ] && ! git diff --quiet HEAD~1 HEAD -- "$f" 2>/dev/null; then
    info "WARNING: $f changed in the last commit but is NOT shipped by this script."
    info "         The server's copy differs from git on purpose. Apply by hand if needed."
  fi
done
info "not bundled: docker-compose.yml, nginx.conf, Dockerfile, package.json, .env"

# ---------------------------------------------------------------------------
# 2. BUNDLE — git archive only. A file copy is what let stale files ride along
#    (the deployed App.js had CRLF endings, the fingerprint of a Windows copy).
# ---------------------------------------------------------------------------
say "Bundling"
PAYLOAD="$WORK/payload"
mkdir -p "$PAYLOAD/tta_backend" "$PAYLOAD/public"

cd "$FE_ROOT"
git archive HEAD src | tar -x -C "$PAYLOAD"
cd "$BE_ROOT"
git archive HEAD backend | tar -x -C "$PAYLOAD/tta_backend"

# The release stamp. public/ is copied into the build root by CRA, so this is
# served as /release.txt. public/ itself is NOT replaced — the server's copy
# carries a templates/ directory that is not in git.
cat > "$PAYLOAD/public/release.txt" <<EOF
frontend $FE_SHA
frontend_branch $FE_BRANCH
backend $BE_SHA
backend_branch $BE_BRANCH
deployed_at $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

BUNDLE="$WORK/tta-$STAMP.tar.gz"
tar -czf "$BUNDLE" -C "$PAYLOAD" src tta_backend public
LOCAL_HASH=$(sha256sum "$BUNDLE" | cut -d' ' -f1)
info "frontend $FE_SHORT ($FE_BRANCH) · backend $BE_SHORT ($BE_BRANCH)"
info "bundle $(du -h "$BUNDLE" | cut -f1) · sha256 ${LOCAL_HASH:0:16}…"

# Prove the bundle carries no infra file and no secret.
if tar -tzf "$BUNDLE" | grep -qE '(^|/)(\.env|docker-compose\.yml|nginx\.conf|Dockerfile|package\.json)$'; then
  die "bundle contains an infrastructure or secret file — refusing to upload"
fi
info "verified: no .env, compose, nginx, Dockerfile or package.json in bundle"

if [ "$DRY_RUN" = 1 ]; then
  say "Dry run — stopping before upload"
  info "bundle left at $BUNDLE (will be cleaned on exit)"
  tar -tzf "$BUNDLE" | head -5
  exit 0
fi

# ---------------------------------------------------------------------------
# 3. UPLOAD and verify the transfer
# ---------------------------------------------------------------------------
say "Uploading"
"$PSCP" -pw "$TTA_DEPLOY_PASS" "$BUNDLE" "$USER_@$HOST:/root/" >/dev/null
REMOTE_HASH=$(rsh "sha256sum /root/tta-$STAMP.tar.gz | cut -d' ' -f1")
[ "$LOCAL_HASH" = "$REMOTE_HASH" ] || die "upload corrupted: $LOCAL_HASH != $REMOTE_HASH"
info "sha256 matches both ends"

# ---------------------------------------------------------------------------
# 4. BACKUP — env first, always
# ---------------------------------------------------------------------------
say "Backing up"
rsh "set -e
  cp $REMOTE/tta_backend/backend/.env /root/tta-env-backup-$STAMP
  cd /root && tar -czf /root/tta-rollback-$STAMP.tar.gz tta/src tta/tta_backend/backend tta/public
  docker tag tta-frontend:latest tta-frontend:pre-$STAMP
  docker tag tta-backend:latest  tta-backend:pre-$STAMP
  ls -la /root/tta-env-backup-$STAMP /root/tta-rollback-$STAMP.tar.gz"

# ---------------------------------------------------------------------------
# 5. DEPLOY — clean replace. This is the step that makes a blended tree
#    impossible: the directories start empty, so what is on disk afterwards is
#    exactly what the commit contains.
# ---------------------------------------------------------------------------
say "Replacing source"
rsh "set -e
  cd $REMOTE
  # Preserve runtime state that lives inside the tree we are about to delete.
  cp tta_backend/backend/.env /tmp/tta.env.$STAMP
  [ -f tta_backend/backend/dev_local.sqlite3 ] && cp tta_backend/backend/dev_local.sqlite3 /tmp/tta.sqlite.$STAMP || true

  rm -rf src tta_backend/backend
  tar -xzf /root/tta-$STAMP.tar.gz src tta_backend
  # public/ is merged, not replaced — the server's copy has a templates/ dir
  # that is not in git and must survive.
  tar -xzf /root/tta-$STAMP.tar.gz public/release.txt

  cp /tmp/tta.env.$STAMP tta_backend/backend/.env
  [ -f /tmp/tta.sqlite.$STAMP ] && cp /tmp/tta.sqlite.$STAMP tta_backend/backend/dev_local.sqlite3 || true
  rm -f /tmp/tta.env.$STAMP /tmp/tta.sqlite.$STAMP

  test -s tta_backend/backend/.env || { echo 'ENV LOST'; exit 1; }
  echo \"env restored: \$(wc -c < tta_backend/backend/.env) bytes\"
  cat public/release.txt"

# The infra files must not have moved. If they did, something wrote outside
# what this script ships and the deploy should be examined before rebuilding.
say "Infra files untouched?"
rsh "cd $REMOTE && ls -l --time-style=long-iso docker-compose.yml nginx.conf Dockerfile"

# ---------------------------------------------------------------------------
# 6. REBUILD — --no-deps is mandatory: this box runs five other compose projects
# ---------------------------------------------------------------------------
say "Rebuilding images"
rsh "cd $REMOTE && docker compose up -d --build --no-deps backend frontend 2>&1 | tail -20"

say "Migrations"
rsh "cd $REMOTE && docker compose exec -T backend python manage.py migrate --noinput 2>&1 | tail -20"

# ---------------------------------------------------------------------------
# 7. VERIFY — assert behaviour, not file presence. "Are the new files there?"
#    returned yes throughout the incident this script exists to prevent.
# ---------------------------------------------------------------------------
say "Verifying"
rsh "cd $REMOTE
  docker compose ps --format '{{.Name}} {{.State}}'
  echo '--- unapplied migrations (want 0) ---'
  docker compose exec -T backend python manage.py showmigrations 2>/dev/null | grep -c '\[ \]' || true
  echo '--- backend reaches MySQL over the bridge ---'
  docker compose exec -T backend python -c \"
from django.db import connection
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','backend.settings'); django.setup()
c = connection.cursor(); c.execute('SELECT COUNT(*) FROM users'); print('users:', c.fetchone()[0])\" 2>&1 | tail -2"

say "Verifying what is actually served"
sleep 5
SERVED=$(curl -s -m 30 "https://tta.indiakhelofootball.com/release.txt" || true)
echo "$SERVED"
if ! echo "$SERVED" | grep -q "$FE_SHA"; then
  die "release.txt does not report $FE_SHORT — Cloudflare may be caching, or the build did not take"
fi
info "served release.txt reports the commit we shipped"

say "Done — frontend $FE_SHORT · backend $BE_SHORT"
cat <<EOF

   Rollback:
     images  docker tag tta-frontend:pre-$STAMP tta-frontend:latest
             docker tag tta-backend:pre-$STAMP  tta-backend:latest
             cd $REMOTE && docker compose up -d --no-deps backend frontend
     code    cd /root && tar -xzf /root/tta-rollback-$STAMP.tar.gz
     env     /root/tta-env-backup-$STAMP

   Cloudflare caches this origin. If the UI looks stale in a browser, purge the
   cache — release.txt above is the authority on what the server is serving.
EOF
