# Separate Client Portal Build (G3)

## Why this exists

The internal TTA + CSR-org app and the external funder portal currently compile into
**one JavaScript bundle**. Route-gating and the login wall stop an outside funder from
**seeing internal data** — but the browser still **downloads the internal app's code**,
because it's in the same bundle. For an external corporate funder, shipping them your
internal screen logic, API shapes, and business rules is information disclosure.

G3 fixes that by producing a **separate bundle for `/client`** that contains *only* the
funder app. Route-gating hides the data; this hides the code.

## How the separation works

- `src/client-index.js` is a second entry point that mounts `src/ClientApp.jsx`.
- `ClientApp.jsx` imports **only** the client portal, auth, and theme — never `App.js`
  or any internal page. So when the bundler builds from this entry, nothing internal is
  reachable and none of it lands in the output.
- `craco.config.js` swaps the webpack entry + HTML template **only** when
  `REACT_APP_TARGET=client`. The default `npm start` / `npm run build` stay on
  `react-scripts` and are **completely unchanged** — the existing deploy is unaffected.

## Build & deploy

```bash
# one-time: install the two additive dev deps
npm install -D @craco/craco cross-env

# build the funder-only bundle → output goes to ./build-client (not ./build)
npm run build:client
```

`build/` (internal app) and `build-client/` (funder app) are now two independent static
sites. Deploy each where it should be served. Two routing options:

**A. Subdomain (cleanest, recommended):** serve `build-client/` at e.g.
`portal.indiakhelofootball.com`, the internal `build/` stays on the main host. Funders
never touch the internal origin at all.

```nginx
server {
    server_name portal.indiakhelofootball.com;
    root /var/www/tta-client;          # contents of build-client/
    location / { try_files $uri /index.html; }   # SPA fallback (file is client.html, copied to index.html on deploy)
    location /api/ { proxy_pass https://tta.indiakhelofootball.com; }
}
```

**B. Same domain, path-based:** route `/client/*` to `build-client/`, everything else to
`build/`. Workable but the two SPAs share an origin, so keep the API on the same host.

> Note: CRA emits the HTML as `client.html` inside `build-client/`. On deploy, rename/copy
> it to `index.html` at the web root (or point nginx's fallback at `client.html`).

## Validate on your machine (I could not run the build in-session)

1. `npm run build:client` compiles with no errors.
2. Confirm the isolation actually holds — the internal code must be absent:
   ```bash
   grep -rl "VendorManagement\|PaymentManagement\|workOrdersAPI" build-client/static/js
   ```
   This should return **nothing**. If it finds matches, an internal import leaked into
   `ClientApp.jsx`'s tree — trace and remove it.
3. Serve `build-client/` locally and check `/client/<slug>/login` renders branded and a
   funder can sign in and see their portal.

## Known integration point to wire up

`APIService` force-redirects to `/login` when a token refresh fails (see
`src/services/api.js`). `/login` is the **internal** login and does **not** exist in the
client bundle. Before going live, give the client build its own session-expiry handling —
redirect an expired funder to `/client` (the scaffold shows a "use your portal link"
notice) or to their `/client/<slug>/login`. This is the one behaviour the split changes
that needs a deliberate decision.

## Status

- Source split + entry + HTML template + craco config + `build:client` script: **in repo,
  additive, main build untouched.**
- Compile/deploy/nginx + the session-expiry wiring: **your side** — they need a machine
  that builds and your nginx in front, which is why this is a deploy task, not a verified
  code change.
