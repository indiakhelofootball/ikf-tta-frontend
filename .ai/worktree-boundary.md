# Worktree boundary — read before touching anything

This is `D:\tta-csr`, a git worktree of the frontend repo on branch `csr/work`.
It exists so CSR work can run in a second Claude Code window without colliding
with the TTA bug work happening in `D:\tta_frontend-main` (branch `main`).

## What this window owns

- **CSR frontend only** — `src/components/csr`, the funder portal, CSR routes.
- Its own branch, `csr/work`. Commit here freely; it cannot disturb `main`.

## What this window must NOT touch

- **`tta_backend/`** — it is gitignored by the frontend repo, so it is NOT in
  this worktree. It exists only at `D:\tta_frontend-main\tta_backend\`, as a
  single repo with a single index. **Owner decision, 2026-08-21: this worktree
  is FRONTEND ONLY.** Never edit the backend from here, even though the path
  is reachable. Backend work -- serializers, views, migrations -- is queued to
  the main window. State what you need and hand it over.
- **The TTA bug work** — `src/components/reports/TrialsReport.jsx`,
  `src/utils/csv.js`, `src/utils/reportExcel.js`, `src/components/rep/`,
  `src/components/trialCities/`. Those have uncommitted changes on `main` in
  the other tree and an open audit against them (F1-F7).

## Port

The other window uses 3000. Start here with `PORT=3001 npm start`.

## Memory is separate

Claude Code keys its memory directory by working-directory path, so this
worktree gets its own store (`D--tta-csr`), not the one at
`D--tta-frontend-main`. Nothing learned here is visible to the other window
and vice versa. Durable decisions must be written to `.ai/` in BOTH trees, or
recorded in the main tree after merge.

## Cleanup

    git worktree remove D:/tta-csr

Run that from `D:\tta_frontend-main` once the branch is merged or abandoned.
