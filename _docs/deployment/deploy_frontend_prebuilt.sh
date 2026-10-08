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
# WHAT IT BUILDS FROM (changed 2026-10-08)
#   - the build CONTEXT is the repo at the commit being shipped: its
#     Dockerfile, package.json, lockfile, craco.config.js, scripts/, public/
#     and src/. Until 10-08 it was the server's own /root/tta with only src/
#     replaced, on the reasoning that the server's files were what every live
#     image had been built from. They were also older than git's, and that is
#     what kept two security bugs live (measured 10-07, fix_bug/TRACKER.md):
#       SEC1  the server's Dockerfile built with source maps ON, so
#             /static/js/main.<hash>.js.map served the staff app's full
#             original source (12.4 MB) to anyone, no login.
#       SEC2  the server's Dockerfile had no build:client stage and its
#             nginx.conf no /client blocks, so /client served the STAFF
#             bundle to external funders — the leak G3 exists to stop.
#     git's Dockerfile builds both bundles with GENERATE_SOURCEMAP=false.
#   - nginx.conf is _docs/deployment/nginx.frontend.conf from the commit: the
#     server's file (its /static/ volume path is not the one in git's root
#     nginx.conf, which serves local compose) plus the index.html cache block
#     and the G3 /client blocks.
#   - taken from the server, read-only, is only what lives nowhere else:
#     files under public/ that git does not have (public/templates/ is the
#     known one). They are added, never allowed to replace a file git has.
#     The server's nginx.conf is fetched too, as the input to a gate.
#   - the node build stage runs on this machine's platform. Its output is
#     plain JS, identical on any CPU; the nginx stage that ships is built for
#     the server's CPU.
#   - after the swap, the same build inputs are written to /root/tta, so a
#     later on-box `docker compose up --build frontend` builds what is live
#     instead of silently reopening SEC1/SEC2. docker-compose.yml is never
#     shipped (the box's copy carries the dbbridge network git lacks).
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
# The value the login request's base-URL variable holds in a minified bundle.
# Must be exactly /api. On 2026-09-19 it was "C:/Program Files/Git/api" and every
# login failed while every status-code check passed. Reads the variable the
# login call actually uses, so it does not depend on how the build encodes env.
api_base_of() {
  local f="$1" v re
  v=$(grep -oE 'concat\([A-Za-z0-9_$]+,"/auth/login/"\)' "$f" | head -1 | sed -E 's/^concat\(//; s/,.*//')
  [ -n "$v" ] || { echo "<login call not found>"; return; }
  re=$(printf '%s' "$v" | sed 's/[$]/\\$/g')
  grep -oE "(^|[^A-Za-z0-9_\$.])${re}=\"[^\"]*\"" "$f" | sed -E 's/^[^=]*="//; s/"$//' | sort -u
}

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
# Every build input comes from HEAD, so an uncommitted edit to any of them
# would silently not ship.
SHIPPED="src public scripts Dockerfile package.json package-lock.json craco.config.js .dockerignore _docs/deployment/nginx.frontend.conf"
# shellcheck disable=SC2086
git diff --quiet HEAD -- $SHIPPED || die "uncommitted changes to build inputs ($SHIPPED). Commit or stash first."
git fetch origin main --quiet 2>/dev/null || info "fetch failed, using cached origin/main"
git merge-base --is-ancestor origin/main HEAD \
  || die "HEAD is missing $(git rev-list --count HEAD..origin/main) commit(s) from origin/main"
FE_SHA=$(git rev-parse HEAD); FE_SHORT=${FE_SHA:0:7}
FE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
info "frontend $FE_SHORT on $FE_BRANCH — contains origin/main"

# A rehearsal contacts no server at all, the live site included.
LIVE=""
[ "$MODE" = rehearse ] && info "REHEARSAL: live release check skipped (no server contact)"
[ "$MODE" = rehearse ] || LIVE=$(curl -s -m 30 "https://tta.indiakhelofootball.com/release.txt" || true)
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
# 2. BUILD CONTEXT — the repo at HEAD, plus server-only public/ files
# ---------------------------------------------------------------------------
CTX="$WORK/ctx"; mkdir -p "$CTX"
SRV="$WORK/srv"; mkdir -p "$SRV"
say "Build context: the repo at $FE_SHORT"
git archive HEAD | tar -x -C "$CTX"
if [ "$MODE" = rehearse ]; then
  ARCH=amd64
  info "REHEARSAL: no server, so no server-only public/ files (a real run carries e.g. public/templates/)"
else
  say "Fetching the server's context (read-only): its server-only files and the nginx gate"
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
  PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$USER_@$HOST:/tmp/tta-ctx-$STAMP.tgz" "$WORK/srv.tgz" >/dev/null
  rsh "rm -f /tmp/tta-ctx-$STAMP.tgz"
  tar -xzf "$WORK/srv.tgz" -C "$SRV"
  [ -f "$SRV/nginx.conf" ] || die "the server's context has no nginx.conf"

  # Server-only public/ files are added; a file git has always wins.
  : > "$WORK/carried.txt"
  if [ -d "$SRV/public" ]; then
    while IFS= read -r f; do
      f=${f#./}
      [ "$f" = release.txt ] && continue
      [ -e "$CTX/public/$f" ] && continue
      mkdir -p "$CTX/public/$(dirname "$f")"
      cp -p "$SRV/public/$f" "$CTX/public/$f"
      echo "$f" >> "$WORK/carried.txt"
    done < <(cd "$SRV/public" && find . -type f)
  fi
  if [ -s "$WORK/carried.txt" ]; then
    info "carried from the server's public/ (git has no copy):"
    sed 's/^/     /' "$WORK/carried.txt"
  else
    info "no server-only public/ files"
  fi
  for f in Dockerfile package.json package-lock.json; do
    cmp -s "$SRV/$f" "$CTX/$f" 2>/dev/null \
      || info "the server's $f differs from git's; git's is used (both bundles, no source maps)"
  done
fi

for f in Dockerfile package.json package-lock.json craco.config.js src/client-index.js; do
  [ -f "$CTX/$f" ] || die "build context has no $f"
done
# SEC1/SEC2 are only closed by a Dockerfile that builds the funder bundle and
# installs it under /client, with source maps off. Refuse anything else.
grep -q 'npm run build:client' "$CTX/Dockerfile" \
  && grep -q 'build-client /usr/share/nginx/html/client' "$CTX/Dockerfile" \
  || die "the Dockerfile does not build and install the /client bundle"
grep -q 'GENERATE_SOURCEMAP=false' "$CTX/Dockerfile" \
  || die "the Dockerfile does not set GENERATE_SOURCEMAP=false"

# nginx.conf comes from the repo, not the server: the server's copy never told
# browsers to re-check index.html (2026-09-21) and has no /client blocks
# (SEC2). The repo file is the server's file plus those two sections, so refuse
# if the server's copy has changed in any other way — that change would
# otherwise be dropped without anyone seeing it. Accepted server states: the
# original, the original + cache block (deploys 09-21 to 10-07), or this file.
NGINX_GIT="$WORK/nginx.frontend.conf"
git show "HEAD:_docs/deployment/nginx.frontend.conf" > "$NGINX_GIT" 2>/dev/null \
  || die "HEAD has no _docs/deployment/nginx.frontend.conf"
grep -q '# G3 BEGIN' "$NGINX_GIT" && grep -q 'location = /client ' "$NGINX_GIT" \
  || die "nginx.frontend.conf has no /client blocks"
strip_g3()    { sed '/# G3 BEGIN/,/# G3 END/d' "$1"; }
strip_cache() { sed '/# The page every route falls back to/,/^    }$/d'; }
if [ "$MODE" != rehearse ]; then
  { cmp -s "$NGINX_GIT" "$SRV/nginx.conf" \
    || strip_g3 "$NGINX_GIT" | diff -B -q - "$SRV/nginx.conf" >/dev/null \
    || strip_g3 "$NGINX_GIT" | strip_cache | diff -B -q - "$SRV/nginx.conf" >/dev/null; } \
    || die "the server's nginx.conf differs from nginx.frontend.conf beyond the cache and /client blocks; reconcile first"
fi
cp "$NGINX_GIT" "$CTX/nginx.conf"
info "nginx.conf from the repo (index.html: no-cache · /client: the funder bundle)"

cat > "$CTX/public/release.txt" <<EOF
frontend $FE_SHA
frontend_branch $FE_BRANCH
backend ${LIVE_BE:-unknown}
backend_branch ${LIVE_BE_BRANCH:-unknown}
deployed_at $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
info "release.txt written (backend stamp carried from live)"

# What /root/tta must hold after the swap so an on-box build agrees with the
# image: git's build inputs, with the Dockerfile as committed (not pinned below).
git archive --format=tar HEAD src public scripts Dockerfile package.json package-lock.json \
  craco.config.js .dockerignore | gzip > "$WORK/inputs.tar.gz"

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
# MSYS_NO_PATHCONV: Git Bash rewrites "/api" to "C:/Program Files/Git/api" when
# passing it to docker.exe. That shipped on 2026-09-19 and broke every login.
# Scoped to this one command: pscp below NEEDS the rewrite for its local paths.
MSYS_NO_PATHCONV=1 docker buildx build --platform "linux/$ARCH" --build-arg REACT_APP_API_URL=/api \
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
  H=/usr/share/nginx/html
  no() { echo "   image check: $*" >&2; exit 1; }
  test -f $H/index.html || no "no staff index.html"
  test -f $H/client/index.html || no "no /client/index.html (SEC2)"
  grep -q "/client/static/js/" $H/client/index.html || no "/client/index.html does not load the funder bundle"
  grep -q "'"$FE_SHA"'" $H/release.txt || no "release.txt is not this commit"
  if find $H -name "*.map" | grep -q .; then find $H -name "*.map" >&2; no "source maps in the image (SEC1)"; fi
  if grep -rl "sourceMappingURL" $H/static/js $H/client/static/js 2>/dev/null; then no "sourceMappingURL trailer (SEC1)"; fi
  if grep -rlE "WorkOrderModal|PermissionsManagement|payment-requests" $H/client/static/js; then no "staff code in the funder bundle (SEC2)"; fi
  test ! -e $H/client/templates || no "internal templates/ in the funder bundle"
  # .js only: a .map carries the original source, including the fallback URL
  if grep -rl --include="*.js" "localhost:8000" $H/static/js $H/client/static/js 2>/dev/null; then no "localhost:8000 API leak"; fi
  nginx -t 2>/dev/null || no "nginx -t failed"
  exit 0
' || die "image failed verification (see the image check above)"
# POSITIVE check: the API address the login call uses must be exactly /api.
# The absence of one known-bad value (localhost:8000) is not enough.
MSYS_NO_PATHCONV=1 docker create --name "apicheck-$STAMP" "$IMG" >/dev/null
MSYS_NO_PATHCONV=1 docker cp "apicheck-$STAMP:/usr/share/nginx/html/static/js" "$(cygpath -w "$WORK" 2>/dev/null || echo "$WORK")/js" >/dev/null
MSYS_NO_PATHCONV=1 docker cp "apicheck-$STAMP:/usr/share/nginx/html/client/static/js" "$(cygpath -w "$WORK" 2>/dev/null || echo "$WORK")/cjs" >/dev/null
docker rm "apicheck-$STAMP" >/dev/null
BASE=$(api_base_of "$(ls "$WORK"/js/main.*.js | head -1)")
[ "$BASE" = "/api" ] || die "image calls the API at '$BASE', not /api. Login would break"
CBASE=$(api_base_of "$(ls "$WORK"/cjs/main.*.js | head -1)")
[ "$CBASE" = "/api" ] || die "funder bundle calls the API at '$CBASE', not /api. Funder login would break"
# The denylist above must be able to match something: if the staff bundle
# stopped carrying the string, its absence from the funder bundle proves nothing.
grep -rlq "payment-requests" "$WORK/js" \
  || die "control failed: 'payment-requests' is not in the staff bundle either, so the funder check is blind"
# Serve the image on this laptop and read the real responses: the entry pages
# must say re-check, the hashed bundles must stay cacheable, every funder URL
# must get the funder shell, and no source map may be served.
MAIN_JS=$(basename "$(ls "$WORK"/js/main.*.js | head -1)")
CMAIN_JS=$(basename "$(ls "$WORK"/cjs/main.*.js | head -1)")
MSYS_NO_PATHCONV=1 docker run -d --rm --name "hdrcheck-$STAMP" --platform "linux/$ARCH" \
  --add-host backend:127.0.0.1 -p 127.0.0.1:18080:80 "$IMG" >/dev/null
sleep 3
U=http://127.0.0.1:18080
hdr() { curl -s -o /dev/null -D - -m 10 "$1" | tr -d '\r' | grep -i '^cache-control:' || true; }
HDR_HTML=$(hdr "$U/login")
HDR_JS=$(hdr "$U/static/js/$MAIN_JS")
HDR_CLIENT=$(hdr "$U/client/acme/login")
HDR_CJS=$(hdr "$U/client/static/js/$CMAIN_JS")
CODE_CJS=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$U/client/static/js/$CMAIN_JS" || true)
CODE_MAP=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$U/static/js/$MAIN_JS.map" || true)
C_BARE=$(curl -s -m 10 "$U/client" || true)
C_ROOT=$(curl -s -m 10 "$U/client/" || true)
C_LOGIN=$(curl -s -m 10 "$U/client/acme/login" || true)
STAFF=$(curl -s -m 10 "$U/login" || true)
docker stop "hdrcheck-$STAMP" >/dev/null 2>&1 || true
echo "$HDR_HTML" | grep -qi 'no-cache' || die "entry page is not no-cache in the image: '$HDR_HTML'"
echo "$HDR_JS" | grep -qi 'max-age' || die "hashed bundle lost its cache header in the image: '$HDR_JS'"
echo "$C_BARE"  | grep -q "/client/static/js/$CMAIN_JS" || die "the image does not serve the funder bundle at /client (SEC2)"
echo "$C_ROOT"  | grep -q "/client/static/js/$CMAIN_JS" || die "the image does not serve the funder bundle at /client/ (SEC2)"
echo "$C_LOGIN" | grep -q "/client/static/js/$CMAIN_JS" || die "the image does not serve the funder bundle at /client/acme/login (SEC2)"
echo "$STAFF"   | grep -q "/static/js/$MAIN_JS" || die "the image does not serve the staff bundle at /login"
echo "$HDR_CLIENT" | grep -qi 'no-cache' || die "funder entry page is not no-cache in the image: '$HDR_CLIENT'"
[ "$CODE_CJS" = 200 ] || die "funder bundle /client/static/js/$CMAIN_JS answers $CODE_CJS"
echo "$HDR_CJS" | grep -qi 'max-age' || die "funder bundle lost its cache header: '$HDR_CJS'"
if echo "$HDR_CJS" | grep -qi 'no-cache'; then die "funder bundle is sent no-cache: '$HDR_CJS'"; fi
[ "$CODE_MAP" != 200 ] || die "the image serves /static/js/$MAIN_JS.map (SEC1)"
info "headers in the image: /login '$HDR_HTML' · bundle '$HDR_JS'"
info "funder portal in the image: /client, /client/, /client/acme/login -> funder shell '$HDR_CLIENT' · bundle $CODE_CJS '$HDR_CJS'"
info "staff + funder bundles · release.txt = $FE_SHORT · both call /api · no .map (served: $CODE_MAP) · no staff code in the funder bundle · no localhost:8000 · nginx -t ok"

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
PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$WORK/inputs.tar.gz" "$USER_@$HOST:/root/tta-inputs-$STAMP.tar.gz" >/dev/null
cp "$CTX/public/release.txt" "$WORK/release.txt"
PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$WORK/release.txt" "$USER_@$HOST:/root/tta-release-$STAMP.txt" >/dev/null
PSCP_T -batch -pw "$TTA_DEPLOY_PASS" "$NGINX_GIT" "$USER_@$HOST:/root/tta-nginx-$STAMP.conf" >/dev/null
rsh "set -e
  cd /root
  # every on-disk build input this deploy replaces, whichever of them exist
  BK=''
  for p in src public scripts nginx.conf Dockerfile package.json package-lock.json craco.config.js .dockerignore; do
    if [ -e tta/\$p ]; then BK=\"\$BK tta/\$p\"; fi
  done
  tar -czf /root/tta-rollback-$STAMP.tar.gz \$BK
  # the on-disk nginx.conf must match the image, or a later build drops the rules
  cp /root/tta-nginx-$STAMP.conf $REMOTE/nginx.conf && rm -f /root/tta-nginx-$STAMP.conf
  docker tag tta-frontend:latest tta-frontend:pre-$STAMP
  gunzip -c /root/tta-frontend-$FE_SHORT.tar.gz | docker load | tail -1
  # keep the on-disk build inputs identical to the image, so a later --build
  # agrees with it instead of rebuilding with source maps and no /client.
  # public/ is overlaid, not replaced: its server-only files stay.
  cd $REMOTE && rm -rf src && tar -xzf /root/tta-inputs-$STAMP.tar.gz
  cp /root/tta-release-$STAMP.txt public/release.txt
  docker tag $IMG tta-frontend:latest
  docker compose up -d --no-deps --no-build frontend 2>&1 | tail -3
  rm -f /root/tta-inputs-$STAMP.tar.gz /root/tta-release-$STAMP.txt"

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

# A LOGIN through the browser's own path. Status codes on / and /api/ passed on
# 2026-09-19 while every login failed. Read the API address out of the bundle
# the site actually serves, then log in with credentials that cannot exist.
JS=$(curl -s -m 30 "https://tta.indiakhelofootball.com/" | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1)
[ -n "$JS" ] || die "could not find the served main bundle"
curl -s -m 90 -o "$WORK/served.js" "https://tta.indiakhelofootball.com/$JS"
API=$(api_base_of "$WORK/served.js")
[ "$API" = "/api" ] || die "served bundle calls the API at '$API', not /api. LOGIN IS BROKEN: roll back"
LOGIN=$(curl -s -m 30 -w ' HTTP%{http_code}' -X POST "https://tta.indiakhelofootball.com$API/auth/login/" \
  -H 'Content-Type: application/json' -d '{"email":"deploy-check@invalid.example","password":"x"}')
echo "$LOGIN" | grep -q 'Invalid email or password.* HTTP401$' \
  || die "login through the served bundle's address failed: $LOGIN. Roll back"
info "login path OK: bundle calls $API, login answers 401 'Invalid email or password'"
# SEC1 and SEC2 as the public meets them.
MAP_LIVE=$(curl -s -o /dev/null -w '%{http_code}' -m 30 "https://tta.indiakhelofootball.com/$JS.map" || true)
[ "$MAP_LIVE" != 200 ] || die "the live staff source map still answers 200 (SEC1). Purge Cloudflare, then recheck"
CLIENT_LIVE=$(curl -s -m 30 "https://tta.indiakhelofootball.com/client/" || true)
echo "$CLIENT_LIVE" | grep -q '/client/static/js/main\.' \
  || die "live /client/ is not the funder bundle (SEC2). Purge Cloudflare, then check the host nginx"
info "live: staff source map -> $MAP_LIVE · /client/ serves the funder bundle"
LIVE_HDR=$(curl -s -o /dev/null -D - -m 20 "https://tta.indiakhelofootball.com/login" | tr -d '\r' | grep -i '^cache-control:' || true)
echo "$LIVE_HDR" | grep -qi 'no-cache' || die "live entry page is not no-cache: '$LIVE_HDR' (Cloudflare or host nginx is overriding it)"
info "live entry page: $LIVE_HDR"
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
       (restores src/, public/, scripts/, nginx.conf, Dockerfile, package*.json,
        craco.config.js, .dockerignore as they were; files this deploy ADDED to
        /root/tta, e.g. a first craco.config.js, stay and are harmless)

   Cloudflare caches this origin. If the UI looks stale, purge the cache —
   release.txt above is the authority on what is served.
EOF
