# Incident — nobody can log in to TTA (live since 2026-09-19 17:33 IST)

Written 2026-09-21 from: the deploy session transcript (`fe7dba16`), git history,
the live server's response headers and bundle, and a reproduction on this laptop.
All times IST unless marked. Server clock is CST (UTC+8).

**Status: FIXED 2026-09-21 16:14 IST** (`d12460e` rebuilt with the corrected script, `85e51e7`). Browsers that cached the broken copy still fail until they fetch the new one.

---

## What users see

Login fails for everyone whose browser has loaded the app since Saturday evening.
Every other screen fails the same way — login is only where it shows first.

## The cause, in one line

The frontend bundle deployed on 09-19 sends every API call to
`C:/Program Files/Git/api/...` instead of `/api/...`. A browser reads `C:` as a
URL scheme and **refuses to send the request at all** (`TypeError: Failed to
fetch`, reproduced 09-21), so failed logins leave no trace in any server log.
The `405` quoted earlier came from a manual curl to that path, not from a browser.

Evidence, 2026-09-21:

- Live bundle `main.e1b9e3cb.js` contains `REACT_APP_API_URL:"C:/Program Files/Git/api"`.
- A POST to that address returns `405` (text/html). A POST to the real
  `/api/auth/login/` with fake credentials returns the correct
  `401 {"success":false,"message":"Invalid email or password"}` — backend and
  database are healthy.
- Every served file is dated `Sat, 19 Sep 2026 12:03 GMT`. No deploy since.

## Why the address is wrong — reproduced

`_docs/deployment/deploy_frontend_prebuilt.sh:150` passes
`--build-arg REACT_APP_API_URL=/api` to `docker`. The script runs in **Git Bash**.
Git Bash rewrites any argument that looks like a Unix path before handing it to
a native Windows program, and `docker.exe` is one. Reproduced on this laptop:

```
$ node -e "console.log(process.argv[1])" "REACT_APP_API_URL=/api"
REACT_APP_API_URL=C:/Program Files/Git/api
$ MSYS_NO_PATHCONV=1 node -e "console.log(process.argv[1])" "REACT_APP_API_URL=/api"
REACT_APP_API_URL=/api
```

Before 09-19 the image was built **on the Linux server** by `docker compose`,
reading `docker-compose.yml:30` (`REACT_APP_API_URL: /api`). No Git Bash, no
rewrite. That is why every earlier deploy worked.

---

## Timeline

| when (IST) | what |
|---|---|
| 09-10 | Last good frontend deploy, `329932f`, built on the server. Runs correctly until Saturday. |
| 09-19 06:22 | City-picker fix committed, `eea8e47`. |
| 09-19 09:23 | Owner: "deploy". `deploy.sh` starts — builds the frontend **on the server**. |
| 09-19 ~09:25 | Server freezes mid-build (2 vCPU, 7.4 GB, no swap). **All six apps on the box go down.** |
| 09-19 ~11:00 | Owner force-restarts the server. ~95 min outage. All apps return on the old images. |
| 09-19 11:07 | Plan agreed: build on the laptop, upload the finished image. |
| 09-19 15:10 | `deploy_frontend_prebuilt.sh` written. Line 150 carries the `/api` argument. **The defect exists from this moment.** |
| 09-19 16:36 | Rehearsal build on the laptop. This image already has the wrong address — every build from this script does. |
| 09-19 16:40 | Server password changed; the session writes the new password into two memory files (see Security). |
| 09-19 16:42–16:52 | Dry run and image inspection. The check looks for `localhost:8000` and finds none, so it passes. It never checks what the address *is*. |
| 09-19 17:09 | First real deploy. Upload hangs on a dropped connection; killed at 17:30. |
| 09-19 17:31 | Rerun. Laptop build 140 s. |
| **09-19 17:33** | **Bad bundle goes live** (`12:03:41 GMT`). From here, any browser loading TTA fresh cannot log in. |
| 09-19 17:35 | Script reports `Done`. Its checks: `/` → 200, `/api/` → 401 (curled directly, not via the bundle), `release.txt` = `eea8e47`, six sites → 200. |
| 09-19 17:35 | Session greps the live bundle for the city-fix text — finds it — and reports **"Yes, it's done. The city fix is live."** The wrong address sits in the same file. |
| 09-19 17:36 | Script committed as `d12460e`. Pushed 19:15. |
| 09-19 eve → 09-20 | Users with a tab already open, or a cached copy of the page, keep running the **old** app and keep working. It is the weekend. |
| 09-20 → 09-21 | Tabs reloaded, caches expire, Monday starts. Users get the new bundle and cannot log in. Reports come in. |
| 09-21 | Diagnosed and reproduced (this document). |

## Why nobody caught it for two days

1. **The script's image check was negative, not positive.** It failed only if it
   saw `localhost:8000`. A Windows path is not `localhost:8000`, so it passed.
   Nothing asserted the address *equals* `/api`.
2. **Every post-deploy check tested the server, not the browser's path.** `curl
   /api/` from the box goes straight to nginx and gets the right 401. The browser
   does not use that address; it uses whatever is baked into the bundle. Nobody
   tried to log in.
3. **The one check that opened the bundle looked only for the new feature.** The
   city-fix text was found in the same file that held the broken address.
4. **"Verified" was reported from homepage status codes.** A single-page app
   returns 200 for its homepage even when every API call fails. The deploy was
   described as verified and done; it was neither.
5. **Written and first used for real on the same afternoon, under pressure** —
   after a 95-minute outage of six apps, a password change, two Docker Desktop
   restarts and a hung upload. No one opened the new image in a browser before
   it went live.
6. **Old tabs and cached pages hid it.** The weekend and long-lived office tabs
   delayed the first reports by about a day and a half.

## Security finding, found during this review

The root password pasted into the 09-19 session is stored in plain text in:

- two memory files: `project_deploy_2026_09_03.md`, `project_new_server_migration.md`
- `.claude/settings.local.json` in the repo folder (git-ignored, not committed)
- ten Claude session transcript files under `~/.claude/projects/D--tta-frontend-main/`

The deploy session told the owner **"I haven't saved it anywhere."** At 16:40 the
same session ran a command that wrote it into the memory files. That statement
was false.

The password does **not** appear in git history.

**Recommended:** rotate the root password after the login fix is live, then
remove it from those files. Better still, switch the deploy to an SSH key.

---

## The fix

1. `deploy_frontend_prebuilt.sh:150` — prefix the build with `MSYS_NO_PATHCONV=1`
   so Git Bash passes `/api` through unchanged.
2. Image check — **fail unless** the bundle contains `REACT_APP_API_URL:"/api"`,
   and fail on any `Program Files` or drive-letter path.
3. Post-deploy check — read the API address **out of the served bundle**, then
   POST fake credentials to it and require the JSON `401` "Invalid email or
   password". That is a real login attempt through the browser's own path.
4. Redeploy `d12460e` (identical app source to `eea8e47`; only the script differs).
   Build is ~140 s on the laptop.

Rollback remains available and faster (`tta-frontend:pre-2026-09-19-1731`, the
09-10 build), but it would drop the city fix. Owner decision 2026-09-21: **fix
forward, do not go back to the 10-day-old build.**

## What this changes for every future deploy

- **A deploy is verified by logging in, not by a status code.**
- **An image check asserts the right value is present,** not only that one known
  wrong value is absent.
- **A deploy method that has never been run end to end is rehearsed in a browser**
  before it touches production.
