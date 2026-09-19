#!/usr/bin/env bash
#
# TTA FRONTEND deploy — build the image on THIS machine, ship the finished image.
# The server compiles nothing.
#
# Run from Git Bash on Windows, from the frontend repo root:
#
#     TTA_DEPLOY_PASS='<root password>' _docs/deployment/deploy_frontend_prebuilt.sh
#     TTA_DEPLOY_PASS='...' _docs/deployment/deploy_frontend_prebuilt.sh --dry-run
#     _docs/deployment/deploy_frontend_prebuilt.sh --rehearse    # no server at all
#
# ---------------------------------------------------------------------------
# WHY THIS SCRIPT EXISTS
#
# On 2026-09-19 deploy.sh ran `docker compose up -d --build` on 47.237.115.74.
# That box has 2 vCPU, 7.4 GB RAM and NO swap, and serves six apps. The
# frontend image runs two full CRA production builds; ~30 s into it the box
# stopped responding and all six apps were down for ~95 minutes until a
# forced restart. The same step had passed on 09-07/09/10 — a latent risk.
#
# What stays identical to an on-box build:
#   - the build CONTEXT is the server's own /root/tta (its Dockerfile,
#     nginx.conf, package.json, lockfile, public/ with templates/), fetched
#     read-only. deploy.sh never shipped those files, so the server's copies
#     are what every live image was built from. Only src/ is replaced, from
#     the commit, exactly as deploy.sh does.
#   - the Dockerfile is the server's, with one change: the node build stage
#     runs on this machine's platform. Its output is plain JS, identical on
#     any CPU; the nginx stage that ships is built for the server's CPU.
#
# The backend is NOT touched. Use deploy.sh-style steps for backend changes.
# ---------------------------------------------------------------------------

set -euo pipefail

HOST="${TTA_DEPLOY_HOST:-47.237.115.74}"
USER_="root"
REMOTE="/root/tta"
FE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLINK="/c/Program Files/PuTTY/plink"
PSCP="/c/Program Files/PuTTY/pscp"
STAMP="$(date +%Y-%m-%d-%H%M)"
WORK="$(mktemp -d)"
MODE=deploy
[ "${1:-}" = "--dry-run" ] && MODE=dry
[ "${1:-}" = "--rehearse" ] && MODE=rehearse

trap 'rm -rf "$WORK"' EXIT

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
info() { printf '   %s\n' "$*"; }
die()  { printf '\n\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }
# Every remote call is time-boxed: on 2026-09-19 a dropped connection left one
# plink call hanging for 20 minutes on a step that takes seconds.
rsh()  { timeout 300 "$PLINK" -batch -pw "$TTA_DEPLOY_PASS" "$USER_@$HOST" "$@"; }
PSCP_T() { timeout 600 "$PSCP" "$@"; }

if [ "$MODE" != rehearse ]; then
  : "${TTA_DEPLOY_PASS:?set TTA_DEPLOY_PASS to the server root password}"
  [ -x "$PLINK" ] || die "plink not found at $PLINK"
fi
docker info >/dev/null 2>&1 || die "Docker is not running on this machine"

# ---------------------------------------------------------------------------
# 1. PREFLIGHT — the same gates as deploy.sh, frontend only
# ---------------------------------------------------------------------------
say "Preflight"
cd "$FE_ROOT"
git diff --quiet HEAD -- src || die "uncommitted changes to src/. Commit or stash first."
git fetch origin main --quiet 2>/dev/null || info "fetch failed, using cached origin/main"
git merge-base --is-ancestor origin/main HEAD \
  || die "HEAD is missing $(git rev-list --count HEAD..origin/main) commit(s) from origin/main"
FE_SHA=$(git rev-parse HEAD); FE_SHORT=${FE_SHA:0:7}
FE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
info "frontend $FE_SHORT on $FE_BRANCH — contains origin/main"

LIVE=$(curl -s -m 30 "https://tta.indiakhelofootball.com/release.txt" || true)
LIVE_FE=$(echo "$LIVE" | awk '/^frontend /{print $2}')
LIVE_BE=$(echo "$LIVE" | awk '/^backend /{print $2}')
LIVE_BE_BRANCH=$(echo "$LIVE" | awk '/^backend_branch /{print $2}')
if [ -z "$LIVE_FE" ]; then
  [ "$MODE" = rehearse ] || die "could not read /release.txt — refusing without the live check"
else
  git cat-file -e "${LIVE_FE}^{commit}" 2>/dev/null \
    || die "production runs $LIVE_FE, which does not exist in this repo"
  git merge-base --is-ancestor "$LIVE_FE" HEAD \
    || die "production runs ${LIVE_FE:0:7}, NOT contained in $FE_SHORT — this would remove live work"
  info "live ${LIVE_FE:0:7} is contained in $FE_SHORT"
fi

# ---------------------------------------------------------------------------
# 2. BUILD CONTEXT — the server's, with src/ from the commit
# ---------------------------------------------------------------------------
CTX="$WORK/ctx"; mkdir -p "$CTX"
if [ "$MODE" = rehearse ]; then
  say "Build context (REHEARSAL: git's infra files, not the server's)"
  git archive HEAD | tar -x -C "$CTX"
  ARCH=amd64
else
  say "Fetching the server's build context (read-only)"
  case "$(rsh uname -m)" in
    x86_64)  ARCH=amd64 ;;
    aarch64) ARCH=arm64 ;;
    *) die "unexpected server architecture" ;;
  esac
  info "server platform: linux/$ARCH"
  rsh "cd $REMOTE && tar -czf /tmp/tta-ctx-$STAMP.tgz \
        --exclude=./node_modules --exclude=./build --exclude=./build-client \
        --exclude=./tta_backend --exclude=./.git --exclude=./_docs \
        --exclude='./.env*' --exclude='*.sql' --exclude='*.tar.gz' ."
  PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$USER_@$HOST:/tmp/tta-ctx-$STAMP.tgz" "$WORK/ctx.tgz" >/dev/null
  rsh "rm -f /tmp/tta-ctx-$STAMP.tgz"
  tar -xzf "$WORK/ctx.tgz" -C "$CTX"
  info "context $(du -sh "$WORK/ctx.tgz" | cut -f1) — Dockerfile, nginx.conf, package files, public/ are the server's"
fi

for f in Dockerfile nginx.conf package.json package-lock.json; do
  [ -f "$CTX/$f" ] || die "build context has no $f"
done

rm -rf "$CTX/src"
git archive HEAD src | tar -x -C "$CTX"
cat > "$CTX/public/release.txt" <<EOF
frontend $FE_SHA
frontend_branch $FE_BRANCH
backend ${LIVE_BE:-unknown}
backend_branch ${LIVE_BE_BRANCH:-unknown}
deployed_at $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
info "src/ replaced from $FE_SHORT; release.txt written (backend stamp carried from live)"

# The server's Dockerfile is older than git's (measured 2026-09-19: no
# build:client stage, npm install, source maps on). Verify against what THIS
# Dockerfile produces, not against git's — the live image has no /client.
WANT_CLIENT=0
grep -q 'build-client' "$CTX/Dockerfile" && WANT_CLIENT=1
info "Dockerfile builds the /client bundle: $([ $WANT_CLIENT = 1 ] && echo yes || echo no)"

# The node stage runs natively here; only the nginx stage targets the server.
sed -i -E '0,/^FROM node:/s//FROM --platform=$BUILDPLATFORM node:/' "$CTX/Dockerfile"
grep -q '^FROM --platform=\$BUILDPLATFORM node:' "$CTX/Dockerfile" \
  || die "could not pin the build stage to this machine's platform"

# ---------------------------------------------------------------------------
# 3. BUILD on this machine
# ---------------------------------------------------------------------------
say "Building tta-frontend:$FE_SHORT for linux/$ARCH (on this machine)"
IMG="tta-frontend:$FE_SHORT"
T0=$(date +%s)
docker buildx build --platform "linux/$ARCH" --build-arg REACT_APP_API_URL=/api \
  --load -t "$IMG" "$(cygpath -w "$CTX" 2>/dev/null || echo "$CTX")" 2>&1 | tail -5
info "built in $(( $(date +%s) - T0 ))s"

# ---------------------------------------------------------------------------
# 4. VERIFY the image before it goes anywhere
# ---------------------------------------------------------------------------
say "Verifying the image"
GOT=$(docker image inspect "$IMG" --format '{{.Architecture}}')
[ "$GOT" = "$ARCH" ] || die "image is $GOT, server needs $ARCH"
info "architecture: $GOT"
# nginx resolves the `backend` upstream at startup; outside compose there is no
# such host, so give it a stand-in or `nginx -t` fails on a correct config.
docker run --rm --platform "linux/$ARCH" --add-host backend:127.0.0.1 --entrypoint sh "$IMG" -c '
  set -e
  H=/usr/share/nginx/html
  test -f $H/index.html
  if [ "'"$WANT_CLIENT"'" = 1 ]; then test -f $H/client/index.html; fi
  grep -q "'"$FE_SHA"'" $H/release.txt
  # .js only: a .map carries the original source, including the fallback URL
  if grep -rl --include="*.js" "localhost:8000" $H/static/js $H/client/static/js 2>/dev/null; then exit 1; fi
  nginx -t 2>/dev/null
' || die "image failed verification (missing bundle, wrong release.txt, or a localhost API leak)"
info "bundle present$([ $WANT_CLIENT = 1 ] && echo ' (+ /client)') · release.txt = $FE_SHORT · no localhost:8000 in .js · nginx -t ok"

IMG_TGZ="$WORK/tta-frontend-$FE_SHORT.tar.gz"
docker save "$IMG" | gzip > "$IMG_TGZ"
LOCAL_HASH=$(sha256sum "$IMG_TGZ" | cut -d' ' -f1)
info "image archive $(du -h "$IMG_TGZ" | cut -f1) · sha256 ${LOCAL_HASH:0:16}…"

if [ "$MODE" != deploy ]; then
  say "$MODE — stopping before upload. Nothing on the server was changed."
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. UPLOAD, BACKUP, SWAP — the server loads an image and restarts one container
# ---------------------------------------------------------------------------
say "Uploading"
PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$IMG_TGZ" "$USER_@$HOST:/root/" >/dev/null
REMOTE_HASH=$(rsh "sha256sum /root/tta-frontend-$FE_SHORT.tar.gz | cut -d' ' -f1")
[ "$LOCAL_HASH" = "$REMOTE_HASH" ] || die "upload corrupted"
info "sha256 matches both ends"

say "Backing up and swapping the frontend"
git archive HEAD src | gzip > "$WORK/src.tar.gz"
PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$WORK/src.tar.gz" "$USER_@$HOST:/root/tta-src-$STAMP.tar.gz" >/dev/null
cp "$CTX/public/release.txt" "$WORK/release.txt"
PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$WORK/release.txt" "$USER_@$HOST:/root/tta-release-$STAMP.txt" >/dev/null
rsh "set -e
  cd /root && tar -czf /root/tta-rollback-$STAMP.tar.gz tta/src tta/public
  docker tag tta-frontend:latest tta-frontend:pre-$STAMP
  gunzip -c /root/tta-frontend-$FE_SHORT.tar.gz | docker load | tail -1
  # keep the on-disk source identical to the image, so a later --build agrees
  cd $REMOTE && rm -rf src && tar -xzf /root/tta-src-$STAMP.tar.gz
  cp /root/tta-release-$STAMP.txt public/release.txt
  docker tag $IMG tta-frontend:latest
  docker compose up -d --no-deps --no-build frontend 2>&1 | tail -3
  rm -f /root/tta-src-$STAMP.tar.gz /root/tta-release-$STAMP.txt"

# ---------------------------------------------------------------------------
# 6. VERIFY — behaviour, on the box and from outside, for every app on it
# ---------------------------------------------------------------------------
say "Verifying"
sleep 5
rsh "cd $REMOTE
  docker compose ps --format '{{.Name}} {{.State}} {{.Image}}'
  echo \"local /     \$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/)  (want 200)\"
  echo \"local /api/ \$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/)  (want 401)\"
  uptime"
SERVED=$(curl -s -m 30 "https://tta.indiakhelofootball.com/release.txt" || true)
echo "$SERVED" | grep -q "$FE_SHA" \
  || die "release.txt does not report $FE_SHORT — Cloudflare cache, or the swap did not take"
info "served release.txt reports $FE_SHORT"
for u in tta.indiakhelofootball.com ikf.indiakhelofootball.com indiakhelofootball.com \
         www.indiakhelofootball.com scout.myfirstkick.com anantcomputing.in; do
  info "$(curl -s -o /dev/null -w '%{http_code}' -m 20 -L "https://$u/")  $u"
done

say "Done — frontend $FE_SHORT (built off-box) · backend untouched"
cat <<EOF

   Rollback:
     docker tag tta-frontend:pre-$STAMP tta-frontend:latest
     cd $REMOTE && docker compose up -d --no-deps --no-build frontend
     cd /root && tar -xzf /root/tta-rollback-$STAMP.tar.gz

   Cloudflare caches this origin. If the UI looks stale, purge the cache —
   release.txt above is the authority on what is served.
EOF
