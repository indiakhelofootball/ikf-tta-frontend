# Design — how TTA is built, and why it is built that way

`CLAUDE.md` describes the *shape* of the code (auth flow, API layer, module
pattern). This file records the **decisions behind that shape** and the traps
that have actually cost time. Do not duplicate `CLAUDE.md` here.

## Two repos, one folder

`D:\tta_frontend-main\` (React) and `tta_backend/` (Django) are independent
repos that happen to share a directory. `tta_backend/` is in the frontend's
`.gitignore`.

**Why it stays this way:** they deploy on different cadences and to different
places. **The cost:** every `git` command must name its repo explicitly, and a
combined commit is unrecoverable without a rewrite.

## Production is a tarball, not a checkout

The single most expensive misconception in this project's history.

`/root/tta` on `47.237.115.74` **is not a git repo.** It arrived as
`tta_deploy_bundle.tar.gz` on 2026-07-23 and has been hand-edited since. Files
are owned by UID 197609 — the Windows UID.

Consequences that are not optional to know:

- `_docs/deployment/DEPLOYMENT.md` opens with `git pull`. There is nothing to
  pull. **Those steps are wrong.**
- **Five backend apps exist only on that box** — `config`, `payments`,
  `permissions`, `reps`, `workorders` differ from `origin/main`. A rebuild from
  GitHub reverts them.
- Deploy = copy files in, `docker compose build`, `docker compose up -d
  --no-deps <svc>`. **`--no-deps` is mandatory**: without it, frontend's
  `depends_on: backend` restarts the backend, and the entrypoint runs migrations
  on every backend start.
- It is a **shared box**. `football-web-1`, `anant-site-web-1`,
  `scout-site-web-1` are other people's apps. Never run a bare `docker compose`
  command that could restart them.
- **Copy the import closure, not the diff.** A deploy failed because two newly
  imported util files were absent from the box. The multi-stage build fails
  safely, but it is a wasted round trip.
- **Hash every file before overwriting it.** What is on the box matches no
  commit.

## Data-integrity decisions

**REPCityAssignment has no FK to TrialCity.** The join is a
`(trial_id, city_name)` **string match**, so no cascade is possible. Removing
*or renaming* a city on a trial strands its assignment.

This was closed at every write path in Aug 2026 — the bulk delete raises rather
than deleting silently, a rename carries the assignment across, and the
single-city DELETE returns 409 naming the REPs. **The FK itself is still not
built**, and remains the deeper fix. Four pre-existing orphans are deliberately
untouched pending an owner decision.

**`SET_NULL`, not `CASCADE`, on `Shipment.assignment`.** So deleting an
assignment silently nulls the link instead of erroring. In-flight shipments
re-read their address live; a delivered one froze its `snap_address` at
dispatch. This is why orphans must never be deleted to "clean up".

## Export decisions

Money is a **number** with an Indian lakh/crore format, dates are **date
cells**, codes are **pinned to text**. A CSV cannot do any of that: money sorts
lexically, dates sort by accident, and a leading zero is lost. Four report
screens share one writer (`src/utils/reportExcel.js`) because copying it four
times is how four exports drift apart.

Rows are passed **raw**, never pre-formatted — pre-formatting a date hands the
column a string and throws away the sorting that is the point.

## The three theme scopes

Deliberately separate, never merged. See `.ai/design-system.md`.

| Scope | Theme | Mounted on |
|---|---|---|
| TTA internal | `src/styles/muiTheme.js` | everything not below |
| CSR | `src/styles/ttaTheme.js` | `/csr/login` + `/csr` group only |
| Funder white-label | `src/components/client/clientTheme.js` | `/client` |

## Known traps

- **`designLint` greps, it does not parse.** A forbidden keyword inside a
  *comment* trips it.
- **react-router-dom v7 is unimportable under jest.** Use `npm test`, never
  `npx jest` — the latter walks into `e2e/` and dies on playwright-core.
- **MUI v7**: `slotProps.input`, not `InputProps`. Autocomplete uses
  `params.slotProps?.input`.
- **The venv is python3.13.** `source activate` + bare `python` falls through to
  system 3.8. Always use the full venv path.
- **Cloudflare caches stale JS chunks** — needs a purge or users get a blank
  page that a hard refresh fixes.

## Related

`.ai/vision.md` · `.ai/design-system.md` · `_docs/deployment/DEPLOYMENT.md`
(**read with the tarball caveat above**) · memory: `production-is-a-tarball`,
`deploy-history`, `orphaned-rep-assignments`
