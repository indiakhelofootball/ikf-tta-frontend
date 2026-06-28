# CSR Client Portal — White-Label Plan

**Goal:** one client portal that serves **many CSR clients**, where each client sees the portal
**in their own brand** — their logo, their image, their colours — while the **layout, screens, and
elements stay identical** for everyone. Skin changes per client; structure never does.

**Design principle:** *structure is code, brand is data.* We build the portal once. Each new
client is a **branding record**, not a new screen or a code change.

> Grounded in the codebase: styling already runs through a single MUI `ThemeProvider`
> (`src/index.js` + `src/styles/muiTheme.js`); `Login.jsx` is brand-agnostic logic; and `reps`
> already store a per-entity logo (`rep_logo_url` / `rep_logo_link`) — so per-client branding is a
> pattern the system already proves.

---

## 1. Fixed vs variable

| Stays the same for every client (code) | Changes per client (data) |
|---|---|
| Page layout, sidebar, navigation, tabs | **Logo** (header + login) |
| Screens: My Project, Activities, Reports | **Primary / secondary colours** (buttons, links, headers, accents) |
| Components, spacing, typography scale | **Login background image / hero** |
| Behaviour, read-only rules, data scoping | **Display name / portal title** |
| Auth, API, routing | *(optional)* favicon, accent shade |

Everything in the right column comes from **one branding record per client**. Nothing in the left
column is touched when a client is added.

---

## 2. Branding data model

A small record, attached to the client engagement. Lives in the new `csr` app:

```
CSRClientBranding
  ├─ project / client      FK → CSRProject (or CSRClientUser)
  ├─ slug                  unique, URL-safe key  (e.g. "acme")
  ├─ display_name          "Acme Foundation CSR"
  ├─ logo_url              hosted image (reuse the reps logo-hosting convention)
  ├─ login_image_url       optional hero/background for the login screen
  ├─ primary_color         hex, e.g. "#0B5FFF"
  ├─ secondary_color       hex
  └─ is_active             bool
```

Why a record, not config files: adding a client = **one INSERT** (or one admin-screen save). No
deploy, no code. This mirrors how every other admin-managed value in TTA already works
(`config` app, admin-managed dropdowns).

**Asset hosting:** reuse whatever `reps.rep_logo_url` / `rep_logo_link` already does for REP logos
(same upload + URL pattern) so we don't invent a new media convention.

---

## 3. How the skin is applied — runtime theming

The portal reads the client's branding and builds an MUI theme **at runtime**, then wraps the
whole `/client/*` tree in it. One provider, every element re-colours automatically.

```jsx
// derive a theme from data — no per-client code
function clientThemeFrom(brand) {
  return createTheme({
    ...muiTheme,                                   // inherit TTA's base theme (typography, spacing)
    palette: {
      ...muiTheme.palette,
      primary:   { main: brand.primary_color },
      secondary: { main: brand.secondary_color },
    },
  });
}

// wrap the client app once
<ClientBrandProvider>                              // fetches + holds the brand
  <ThemeProvider theme={clientThemeFrom(brand)}>
    <CssBaseline />
    <ClientLayout logo={brand.logo_url} title={brand.display_name}>
      <Routes> … client screens … </Routes>
    </ClientLayout>
  </ThemeProvider>
</ClientBrandProvider>
```

Because we **inherit `muiTheme`** and override only the palette, every client gets the same
polished components and spacing — only the colours and logo differ. That is exactly "elements
stagnant, brand changes."

---

## 4. Reusing the login module

The login *logic* is reused wholesale; only its wrapper changes.

- **Reused as-is:** `useAuth().login` / `otpLogin`, `validateLoginForm`, the `APIService` call,
  token storage, refresh-on-401. None of it is brand-specific.
- **New (thin):** a `ClientLogin` screen that renders the **same form fields** inside the client
  theme, showing the client's logo and login image.

Cleanest refactor: extract the presentational form from `Login.jsx` into a shared `<LoginForm />`
(fields + submit, no branding), then:
- `/login` → internal IKF login (existing look)
- `/client/:slug/login` → `<ClientThemeProvider slug><LoginForm/></ClientThemeProvider>`

Same engine, two skins.

---

## 5. Entry & login flow (branded per client)

To brand the login screen we must know *which* client **before** auth. Solve it with a
**per-client URL slug** (or subdomain) plus a small **public** branding endpoint (logo + colours
only — nothing sensitive):

```
1. Client visits   /client/acme/login           (slug = acme)
2. Portal GETs     /api/client/branding/acme/     (PUBLIC: logo, colours, name)  ← unauthenticated
3. Login screen renders in Acme's brand
4. Client logs in → same /api/auth/login, JWT issued
5. AuthContext sees role CSR_CLIENT → routes to /client/acme/dashboard
6. Every client query is scoped to their CSRProject (CSRClientScoped); contract/financials hidden
```

Post-login, branding is already known from the same record, so the whole portal stays in-brand
automatically.

> **Recommended:** slug-based URL (`/client/acme/login`) — zero infra, works on the existing
> deployment. A subdomain (`acme.tta…`) looks even more "theirs" but needs DNS + TLS wildcard per
> client; defer unless the owner wants it. (Flagged in §8.)

---

## 6. Backend pieces (new, small)

- `CSRClientBranding` model + migration (in the `csr` app).
- **Public** read endpoint `GET /api/client/branding/<slug>/` — returns logo, colours, name, login
  image. No auth (branding isn't secret); rate-limited.
- `CSR_CLIENT` role on `User`; `CSRClientUser` links a user → one `CSRProject`.
- `CSRClientScoped` permission: every client request filtered to their project; **contract and
  financial fields stripped** from serializers for client/partner.

All additive — no change to existing TTA auth or data behaviour.

## 7. Frontend pieces (new, small)

- `ClientBrandProvider` + `useClientBrand()` — fetch by slug, hold in context.
- `clientThemeFrom(brand)` — palette override over the base `muiTheme`.
- `ClientLayout` + `ClientSidebar` — fixed structure, brand-driven logo/title/colours.
- `ClientLogin` reusing the extracted `<LoginForm />`.
- Client screens: `MyProject`, `Activities` (read-only), `Reports` (download published).
- `clientAPI` block in `services/api.js`.
- Routes `/client/:slug/*` under `RequireAuth`, gated to `CSR_CLIENT`.

---

## 8. Reuse vs new — the guarantee

**Reused unchanged:** auth API + JWT + refresh, `User`/`AuthContext`/`APIService`, login *logic*
and validation, the base `muiTheme`, the reps logo-hosting convention, the role/grant scoping
machinery, and all CSR/TTA domain data via FKs.

**New (built once, reused for every client):** `CSRClientBranding` + public branding endpoint,
`ClientBrandProvider` + runtime theme, `ClientLayout`/`ClientSidebar`, `ClientLogin`, the
read-only client screens. **Adding client #2…#N = one branding record each. No new code.**

---

## 9. Build phases

| Phase | Deliverable |
|---|---|
| **C1** | `CSRClientBranding` model + migration; public `GET /branding/<slug>/` endpoint. |
| **C2** | `ClientBrandProvider` + `clientThemeFrom()`; prove runtime re-theming with 2 dummy brands. |
| **C3** | Extract `<LoginForm />` from `Login.jsx`; build `ClientLogin` at `/client/:slug/login`. |
| **C4** | `ClientLayout` + `ClientSidebar` (fixed structure, brand-driven logo/colours). |
| **C5** | `CSR_CLIENT` role + `CSRClientUser` scoping + `CSRClientScoped` (contract/financials hidden). |
| **C6** | Client screens: My Project · Activities (read) · Reports (download). |
| **C7** | End-to-end: two branded clients, each sees only their project, fully in their brand. |

C1–C4 depend on **none** of the open business questions — the white-label shell can be built and
demoed (with dummy data) before the CSR backend logic is finalised.

---

## 10. Flagged decisions

1. **Login URL form** — slug path (`/client/acme/login`, recommended, zero infra) vs per-client
   subdomain (`acme.tta…`, needs DNS + wildcard TLS).
2. **How dark the theming goes** — palette + logo only (fast, safe), or also fonts/imagery/login
   hero (more "theirs", slightly more design work). Default: palette + logo + login image.
3. **Who edits a client's brand** — TTA admin only, or the client themselves? (`CSR_REC_2` says the
   client "has all the access to make the view" — may want self-serve branding later.)
4. **One client, one or many projects** — affects whether branding attaches to the client or the
   project (still open from the brief §8).
