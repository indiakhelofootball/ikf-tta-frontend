#!/usr/bin/env bash
# Fail-closed check that the funder bundle leaks nothing internal.
#
# Run after `npm run build:client`. Exit 0 is the only pass.
#
# This replaces a three-name grep — VendorManagement|PaymentManagement|workOrdersAPI
# over *.js — which passed while the build shipped a 3 MB source map containing
# services/api.js in full readable source, 40 internal CSR endpoints, and a live
# bank account number. A grep over .js contents cannot see a .map file at all,
# and a denylist of three names cannot see anything nobody has thought of.
#
# So: allowlist what the portal actually needs, and inspect the file TREE, not
# just the JS. Anything new that leaks in fails this without the check needing
# to be updated first.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

DIR=build-client
fail=0

note() { printf '  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }

[ -d "$DIR" ] || { echo "FAIL  $DIR missing — run: npm run build:client"; exit 2; }

# (a) Source maps. Only visible by looking at the tree; the old grep never could.
if find "$DIR" -name '*.map' | grep -q .; then
  bad "source map shipped:"; find "$DIR" -name '*.map' | sed 's/^/        /'
fi
grep -rlq "sourceMappingURL" "$DIR/static" 2>/dev/null && bad "sourceMappingURL trailer in bundle"
grep -rlq "sourcesContent"   "$DIR"        2>/dev/null && bad "inlined original source in $DIR"

# (b) Every path literal must be one the funder portal needs. An allowlist, so a
#     path nobody anticipated still fails.
ALLOWED='^"/(client(/[a-z:-]+)*/?|auth/(login|change-password|token/refresh)/)"$'

# Known residue, each tolerated for a stated reason. This list must SHRINK,
# never grow — anything not on it fails the check.
#
#   /login /csr /csr/ /csr/login
#       Route strings in auth/loginDoor.js, which decides which of the three
#       login doors an expired session returns to. Shared by both bundles by
#       design. Route names, not API surface.
#
#   /auth/otp/* /auth/profile/ /permissions/me/ /config/?category=
#       Reached through AuthContext, which the portal needs for login and
#       session handling and which statically imports the internal APIService.
#       Endpoint NAMES only: the CRUD factories they belong to are dropped by
#       the /*#__PURE__*/ annotations in services/api.js, so the 40-endpoint CSR
#       map that used to ship here is gone. Clearing these last five means
#       giving the portal its own auth context — tracked, not forgotten.
RESIDUE='^"(/login|/csr|/csr/|/csr/login|/auth/otp/(request|verify)/|/auth/profile/|/permissions/me/|/config/.?category=)"$'

UNEXPECTED=$(grep -rhoE '"/[a-z][A-Za-z0-9_/-]*/?(\?[a-z]+=)?"' "$DIR/static/js" 2>/dev/null \
  | sort -u | grep -vE "$ALLOWED" | grep -vE "$RESIDUE")
if [ -n "$UNEXPECTED" ]; then
  bad "non-portal path literals in the client bundle:"
  printf '        %s\n' $UNEXPECTED
  note "these arrive through a service-layer import — trace from ClientApp.jsx"
  note "and cut it. Do NOT widen the allowlist unless a funder needs the endpoint."
fi

# (c) public/ is copied wholesale into every build, so anything dropped there
#     reaches external clients. That is how a populated ICICI debit account
#     number ended up downloadable at /client/templates/.
[ -e "$DIR/templates" ] && bad "internal templates/ copied into the funder build"

# (d) The internal PWA manifest names five internal modules and sets start_url
#     to "/", so an installed funder portal opened the STAFF app.
if [ -f "$DIR/manifest.json" ] && grep -q '"TTA' "$DIR/manifest.json" 2>/dev/null; then
  bad "internal TTA manifest.json shipped to funders"
fi

# (e) Component-level leak. Kept from the original check — still worth asserting.
if grep -rlqE "VendorManagement|PaymentManagement|workOrdersAPI|blkpayExcel" "$DIR/static/js" 2>/dev/null; then
  bad "internal component/util code in the client bundle"
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS  funder bundle is clean ($(du -sh "$DIR" | cut -f1), $(find "$DIR" -type f | wc -l) files)"
fi
exit $fail
