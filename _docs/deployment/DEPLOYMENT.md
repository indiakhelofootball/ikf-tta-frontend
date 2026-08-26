# TTA Deployment Guide

**Status:** rewritten 2026-08-15 for the Docker stack.
**Live host:** `47.237.115.74` (Alibaba Cloud, Ubuntu, Docker + native MySQL 8.4)
**Domain:** tta.indiakhelofootball.com (behind Cloudflare)

> The previous revision of this file described the **decommissioned** box
> `47.245.98.149`: build locally, `pscp` the `build/` folder, `systemctl restart tta`,
> gunicorn on `/run/tta.sock`, MariaDB 10.1. None of that exists any more. TTA moved
> to `47.237.115.74` on 2026-07-24. Do not follow any copy of the old steps.
>
> **What is verified from this repo** (and therefore trustworthy here): `Dockerfile`,
> `nginx.conf`, `docker-compose.yml`, `docker-compose.local.yml`,
> `tta_backend/Dockerfile`, `tta_backend/docker-entrypoint.sh`, and the frontend image
> build (run and grepped 2026-08-15).
> **What is NOT verified from this repo:** the server-side directory that holds
> `docker-compose.yml`, the host-nginx/TLS vhost, and the Cloudflare configuration.
> Those live on the box, not in git. Confirm them on the server before quoting them.

---

## Architecture

```
Cloudflare  ──►  host nginx on 47.237.115.74 (terminates TLS)
                    └─► 127.0.0.1:8080  ──►  frontend container (nginx:1.27-alpine)
                                                 ├── /            → internal React build   (/usr/share/nginx/html)
                                                 ├── /client/     → funder portal build    (/usr/share/nginx/html/client)
                                                 ├── /api/        → proxy_pass backend:8020
                                                 └── /static/     → shared static_volume (Django admin/DRF)
                                              backend container (gunicorn, 4 workers, :8020)
                                                 └── native MySQL 8.4 on the host, via host.docker.internal
```

Two images, one compose project:

| service    | build context | image                | published |
|------------|---------------|----------------------|-----------|
| `frontend` | `.`           | `tta-frontend:latest`| `127.0.0.1:8080:80` |
| `backend`  | `./tta_backend` | `tta-backend:latest` | internal `expose: 8020` only |

`frontend` is published on **loopback only** on purpose — the host nginx terminates
TLS in front of it. Docker's iptables rules sit ahead of ufw, so binding `0.0.0.0`
would answer on `http://<public-ip>:8080` and bypass both TLS and Cloudflare even
with a firewall deny in place.

The backend DB lives on the host, not in a container (the box is shared with IKF, so
a second MySQL is not run); it is reached via the `host.docker.internal:host-gateway`
extra_host.

---

## The frontend is built INSIDE the image — never uploaded

There is no `scp` step any more, and `build/` on your laptop is **not** the deploy
artefact. `deploy.bat` has been retired accordingly.

This is also a correctness requirement, not just a convenience:

- CRA loads `.env` files in this order, first definition wins
  (`node_modules/react-scripts/config/env.js`; dotenv never overrides an already-set value):

  | mode | order |
  |------|-------|
  | production (`npm run build`) | `.env.production.local` → `.env.local` → `.env.production` → `.env` |
  | development (`npm start`)    | `.env.development.local` → `.env.local` → `.env.development` → `.env` |
  | test (`npm test`)            | `.env.test.local` → `.env.test` → `.env`  (`.env.local` is skipped) |

  Note slot 2: **`.env.local` outranks `.env.production`.** A dev override left in
  `.env.local` therefore leaks into a production build — and did: both `build/` and
  `build-client/` were emitting `http://localhost:8000/api`. Put machine-local
  overrides in `.env.development.local`, which only applies to `npm start`.

- The image build is immune to all of that: `.dockerignore` excludes `.env*` from the
  build context, and the Dockerfile sets `ENV REACT_APP_API_URL=$REACT_APP_API_URL`
  (default `/api`) as a real process env var, which dotenv cannot override.
  Verified 2026-08-15: `docker build` → grep of both bundles inside the image →
  zero occurrences of `localhost:8000`.

`/api` is deliberately **relative**: the container's own nginx reverse-proxies `/api/`
to `backend:8020`, so the bundle needs no absolute host and works behind Cloudflare
without a CORS or mixed-content problem.

---

## Deploying

> **`git pull` DOES NOT WORK ON THIS BOX. `/root/tta` is not a git repo.**
> Confirmed on the server 2026-08-26: `git pull` there returns
> `fatal: not a git repository`. The files arrived as a tarball on 2026-07-24
> and carry the Windows UID `197609`. Every successful deploy since — 08-19 and
> 08-26 — has been a file copy. The instructions that used to sit here told you
> to pull; they were wrong for over a month. Pushing to GitHub does NOT deploy.

### The method that works

**Bundle ONLY `src/` and `tta_backend/backend/`.** Nothing else. See the warning
below for why that is not optional.

```bash
# --- on your machine, both repos on the commit you are shipping ---
mkdir -p /tmp/payload/tta_backend
git archive --format=tar <FE_COMMIT> src | tar -x -C /tmp/payload
(cd tta_backend && git archive --format=tar <BE_COMMIT> backend) | tar -x -C /tmp/payload/tta_backend
tar -czf tta-<name>.tar.gz -C /tmp/payload .

# git archive, NOT a manual copy: it emits exactly the committed tree, so it
# cannot miss a new file. Copying only CHANGED files broke the 08-19 build --
# two new imports were absent from the box.

# verify before sending — any hit here means STOP
find /tmp/payload -name ".env" -o -name "docker-compose.yml" -o -name "nginx.conf"      -o -name "Dockerfile" -o -name "package.json"

scp tta-<name>.tar.gz root@47.237.115.74:/root/     # from PowerShell, not PuTTY
```

```bash
# --- on 47.237.115.74 ---
cp /root/tta/tta_backend/backend/.env /root/tta-env-backup-$(date +%F)   # FIRST
cd /root && tar -czf tta-rollback-$(date +%F).tar.gz tta/src tta/tta_backend/backend
cd /root/tta && tar -xzf /root/tta-<name>.tar.gz
ls -la /root/tta/tta_backend/backend/.env        # must still be 380 bytes

docker tag tta-frontend:latest tta-frontend:pre-<name>
docker tag tta-backend:latest  tta-backend:pre-<name>

docker compose up -d --build --no-deps backend frontend
docker compose ps
docker compose logs --tail=40 backend            # confirm migrations applied
curl -s -o /dev/null -w "%{http_code}
" http://127.0.0.1:8080/     # 200
curl -s -o /dev/null -w "%{http_code}
" http://127.0.0.1:8080/api/ # 401 = healthy
```

`--no-deps` matters: this box also runs `football`, `anant-site` and
`scout-site`. Without it you risk moving someone else's app.

### THE INFRASTRUCTURE FILES ON THE BOX DIFFER FROM GIT — DO NOT SHIP THEM

The server's `docker-compose.yml` carries fixes that were never committed:

```yaml
    networks: [default, dbbridge]         # git has NEITHER of these
networks:
  dbbridge: {external: true, name: football_default}
```

That is the July cross-bridge fix. **Without it the backend cannot reach MySQL
and the site goes down.** The static volume mount also differs
(`/var/www/static` on the box vs `/staticfiles` in git).

Before every deploy, check whether the release even touches them:

```bash
git diff --name-only <deployed>..<new> -- docker-compose.yml nginx.conf Dockerfile package.json
```

Empty output means a code-only bundle is safe. Any output means stop and
reconcile by hand — the box's version is probably the correct one.

### A failed build is safe

The multi-stage build aborts before replacing the image, so the running
containers keep serving. That is what happened on 08-19.

### Rollback

```bash
docker tag tta-frontend:pre-<name> tta-frontend:latest
docker tag tta-backend:pre-<name>  tta-backend:latest
cd /root && tar -xzf tta-rollback-<date>.tar.gz
cd /root/tta && docker compose up -d --no-deps backend frontend
```

`BUILD_ID` is a no-op here — the server's compose file has no such build arg
(only the git copy does), so the sidebar hash stays `docker`.

`BUILD_ID` is stamped into the UI so a running bundle can be identified in the field.
`.git` is not in the frontend build context, so the hash cannot be read inside the
image — it has to be passed in. It falls back to the literal `docker`, which means
"nobody passed a hash".

Frontend only: `docker compose up -d --build frontend`.
Backend only: `docker compose up -d --build backend`.

### Migrations run themselves

`tta_backend/docker-entrypoint.sh` runs on **every** backend container start, before
gunicorn:

```sh
python manage.py collectstatic --no-input
python manage.py migrate --no-input
```

So a backend restart applies migrations. There is no separate migrate step. Verify:

```bash
docker compose exec backend python manage.py showmigrations | grep -v '\[X\]'
```

### Backend configuration

The backend reads `./tta_backend/backend/.env` via compose `env_file:`. That file is
gitignored and lives only on the server (and on dev machines). `SECRET_KEY` is
mandatory — `backend/settings.py` raises `ImproperlyConfigured` when it is missing
and `DEBUG` is false.

---

## After deploying: purge Cloudflare

Cloudflare has served stale JS chunks on this deployment before. The SPA shells
(`index.html`, `client/index.html`) are already sent `no-store` by `nginx.conf`, but
purge anyway if users report a blank page:

- Cloudflare dashboard → Caching → Purge Everything
- A hard refresh fixes an individual user; the purge fixes everyone.

If you change the **host** nginx config on the box, use `systemctl restart nginx` —
a reload has been observed not to apply on this host.

---

## Running the whole stack locally

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

The local override adds a throwaway MySQL 8.4 (`db` service) and repoints the
backend's `DB_*` at it, so nothing touches production. It is published on
`127.0.0.1:13306` only — the volume holds a copy of production data and the root
password is trivial. This override file is **not** used on the server.

App at http://localhost:8080 — the funder portal at http://localhost:8080/client.

---

## The two frontend bundles (G3)

`npm run build` emits the internal staff app (~26 MB, five JS chunks).
`npm run build:client` emits a **separate** funder portal bundle from
`src/client-index.js` via `craco.config.js` (~3.5 MB, one chunk, zero internal
modules) with `PUBLIC_URL=/client`. The Dockerfile runs both and copies
`build-client` to `/usr/share/nginx/html/client`, **after** the internal build so it
is never overwritten.

Route-gating hides an external funder's *data*; the separate bundle is what hides the
internal *code*. Without the `/client` blocks in `nginx.conf` the second build is dead
code and funders get served the staff bundle. See `_docs/deployment/CLIENT_BUILD.md`.

---

## Troubleshooting

**Blank page after a deploy** — stale chunk from Cloudflare. Purge everything; hard
refresh confirms it for one user.

**Frontend loads, every API call fails** — check the API base actually baked into the
bundle:
```bash
docker compose exec frontend grep -o "localhost:8000" /usr/share/nginx/html/static/js/main.*.js
```
Any hit means the image was built from a context that leaked a `.env*` file. Rebuild;
`.dockerignore` must contain `.env*`.

**`/api` returns 502** — backend container is down or crash-looping:
`docker compose logs backend --tail=100`. Most often `SECRET_KEY` missing from
`tta_backend/backend/.env`, or MySQL unreachable on `host.docker.internal`.

**Main app works, `/client` serves the staff bundle** — the `location = /client` exact
match in `nginx.conf` is missing or was overridden. That is the exact leak G3 exists
to stop; treat it as a security bug, not a routing nit.

**Django admin loses its CSS** — `static_volume` is stale. The backend writes it on
start via `collectstatic`; restart the backend, not the frontend.

**Absolute URLs come out as `http://`** — `SECURE_PROXY_SSL_HEADER` in
`backend/settings.py` depends on every proxy in the chain setting
`X-Forwarded-Proto`. The container nginx does; check the host vhost too.

---

## Old-box facts that no longer apply

Kept only so stale notes elsewhere can be recognised as stale:

- IP `47.245.98.149`, Ubuntu 18.04, MariaDB 10.1.48
- `pscp`/`plink` upload of `build/` to `/root/TTA/frontend/ikf-tta-frontend/build/`
- gunicorn under systemd (`tta.service`, `tta.socket`, `/run/tta.sock`)
- `sudo systemctl restart tta`
- host nginx vhost with `ssl on;` and `root /root/TTA/frontend/...`
- `source /root/TTA/backend/venv/bin/activate && python manage.py migrate`

None of these exist on `47.237.115.74`.
