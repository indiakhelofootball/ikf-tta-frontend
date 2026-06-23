# Plan — REP Logo: compressed copy on server + full-quality original in Google Drive

**Status:** Planned, NOT started. No code written yet. Saved for later.
**Work-list item:** #2 — "Google Drive option for logos on Reports / REP Management" (16/06/2026).
**Date saved:** 2026-06-19

---

## 1. Goal (what the users actually want)

- Users upload a REP logo that may be larger than the current **2 MB** cap.
- They do **not** want to lose quality.
- So: keep the **full-quality original in Google Drive**, and store only a small,
  **compressed copy on the server** for fast in-app display.
- From the app they want to **open/retrieve the original** (a Drive link, opens in a new tab).

Key fact established during analysis: there is **no image compressor anywhere** in the
codebase today. Uploads (`handleRepLogoUpload`) just `FileReader.readAsDataURL` → store
base64 in `rep_logo_url`, and **reject** anything over 2 MB. A 4 MB logo today is neither
saved nor compressed — it's blocked. This plan adds the compression + Drive split.

## 2. Chosen approach

- **Original → Drive: auto-upload from the browser** via Google OAuth (Google Identity
  Services). Chosen over server-side upload because the production server (Alibaba) has
  shown it cannot reach external APIs (the PIN API `api.postalpincode.in` was blocked);
  the browser has internet, so it sidesteps that limit.
- **Compressed copy → server**, stored as today in `rep_logo_url` (base64), just small.
- **Target in Drive: one central shared folder** (all logos in one place). *(LOCKED.)*

## 3. Decisions

| Decision | Choice |
|---|---|
| How original reaches Drive | Browser OAuth (Google Identity Services), client-side upload |
| Where originals live | **One central shared folder / Shared Drive** |
| Server copy | Compressed (small) base64 in existing `rep_logo_url` |
| OAuth scope | `drive.file` (least privilege — app only touches files it creates) |
| Google Workspace org (all uploaders same domain)? | **OPEN — must resolve before building** (see §6) |

## 4. Architecture / implementation outline

### Backend (`ikf-tta-backend`) — small
- Add `rep_logo_link` (URLField/TextField, blank, default `''`) to the REP model.
- Add `repLogoLink` (source `rep_logo_link`) to `REPSerializer`.
- One migration: `reps/0018_add_rep_logo_link`.
- No Drive API on the backend — the browser does the upload. Backend just stores the link.

### Frontend (`ikf-tta-frontend`)
1. **Compression**: on file pick, produce a small copy (e.g. max ~800 px, ~150–250 KB)
   using `browser-image-compression` (2025 standard) or native
   `createImageBitmap` + canvas `convertToBlob({ quality })`. Store that base64 in
   `rep_logo_url` (the existing field/flow), so in-app display stays fast.
2. **Drive upload** (the original, uncompressed):
   - Load **Google Identity Services** (`https://accounts.google.com/gsi/client`).
     Do NOT use the deprecated `gapi.auth2`.
   - `google.accounts.oauth2.initTokenClient({ client_id, scope:
     'https://www.googleapis.com/auth/drive.file', callback })`.
   - On upload: request token (user consents once), then `POST` multipart to
     `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` with the
     original file + metadata (`parents: [<CENTRAL_FOLDER_ID>]`).
   - Set sharing so teammates can open it: `POST .../files/{id}/permissions`
     with `{ role: 'reader', type: 'anyone' }` (or rely on the central folder already
     being shared).
   - Build link `https://drive.google.com/file/d/<id>/view` → save to `rep_logo_link`.
3. **UI** (`REPModal`): keep the existing upload control; the same picked file feeds both
   the compressor (server copy) and the Drive upload (original). Show a "Connect Google &
   upload original" affordance + status.
4. **Display**: compressed thumbnail inline (as today) **plus** an "Open original (Drive)"
   link in `REPDetailView`, `Repcard`, and `SocialMediaReport`.

## 5. Prerequisites the org must provide (cannot be done in code)
- A **Google Cloud project** with the **Drive API enabled**.
- An **OAuth consent screen** configured.
- An **OAuth Client ID (Web application)** with authorized JavaScript origins:
  `http://localhost:3000` and `https://tta.indiakhelofootball.com`.
- The **central Drive folder ID** (a Shared Drive folder, shared appropriately).
- Provide the Client ID → goes in frontend env `REACT_APP_GOOGLE_CLIENT_ID`
  (and the folder ID in env too, e.g. `REACT_APP_DRIVE_LOGO_FOLDER_ID`).
- No client secret is needed for the browser token flow.

## 6. Open decision to resolve first — Workspace org
Whether all uploaders are on one Google Workspace domain decides OAuth friction:
- **All one Workspace org** → consent screen can be **Internal**; no Google app
  verification; ships fast.
- **Mixed / personal @gmail** → consent screen must be **External**; the `drive.file`
  scope may require Google verification before broad use; users see an "unverified app"
  warning until then.
Resolve this before building — it affects setup, not the code shape.

## 7. Caveats / notes
- `drive.file` scope = the app can only see/manage files **it** created. Good for least
  privilege; the app can still set the file's share permission after upload.
- Browser OAuth tokens are **short-lived** (no stored refresh token) — fine for a
  one-click upload; the user may re-consent on a new session.
- Central-folder uploads require the signed-in user to have **write access** to that
  folder (or it being a Shared Drive they're a member of).
- This also *reduces* DB/payload bloat vs. today: the server copy is small, so REP
  list/report payloads get lighter (ties into the separate site-slowness findings).
- Repo rules: backend and frontend are **separate repos / separate commits**; nothing
  pushed without explicit approval.

## 8. Rough build order (when resumed)
1. Resolve §6 (Workspace org) + obtain Client ID + central folder ID.
2. Backend: model field + serializer + migration `reps/0018`.
3. Frontend: compression util → wire into `REPModal` (server copy).
4. Frontend: GIS token client + Drive multipart upload + permission set → save link.
5. Display surfaces: thumbnail + "Open original (Drive)" link.
6. Test end-to-end with a >2 MB logo; verify original opens at full quality from Drive.
