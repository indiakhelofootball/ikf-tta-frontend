# CI/CD — is this the right move, and in what order

Assessment for TTA specifically: two repos, one shared Alibaba box, 11 users, two people
(you on TTA, Shanu on IKF), three days into running containers in production.

Short answer: **CI, yes — immediately, and you already have one that has never worked.
CD, not yet.** But the two things you actually want from "CD" are achievable now without
push-to-deploy, and they matter more than the automation does.

---

## 1. You already have CI. It has never passed.

`tta_backend/.github/workflows/django-tests.yml` exists and runs on every push and PR to
`main`. Its test step is:

```yaml
run: python manage.py test --verbosity=1
```

No `--settings=backend.test_settings`. I ran exactly that in a clean environment with no
`.env`, which is what a GitHub runner is:

```
django.core.exceptions.ImproperlyConfigured: SECRET_KEY is not set.
```

It dies at settings import, before a single test runs. And even with a `SECRET_KEY`
injected it would then try to reach MySQL on `localhost`, which does not exist on a runner.
`backend/test_settings.py` — which points at in-memory SQLite and exists precisely for this
— is never used.

This matters more than it looks. A red pipeline nobody reads is worse than no pipeline: it
trains everyone to ignore the signal, so the day it goes red *for a real reason* nobody
notices. Fixing this one line is the highest-value CI work you have, and it costs nothing:

```yaml
run: python manage.py test --settings=backend.test_settings --verbosity=1
```

The suite runs 300 tests in ~2.3 seconds on SQLite. That is an outstanding CI candidate —
fast enough that nobody will ever be tempted to skip it.

The frontend repo has **no workflow at all**.

---

## 2. The blocker is not tooling — nothing is committed

CI runs on commits. Right now both trees carry 15 modified files plus untracked ones
including migration `0005`, spread across three unrelated workstreams, on top of a
line-ending churn that makes every diff 30,000 lines of noise.

You cannot meaningfully gate on tests when the thing being tested has never been committed.
And the first thing a pipeline will do is surface that noise on every single run.

**Prerequisites, in order, before any pipeline work:**

1. `.gitattributes` with `* text=auto`, then `git add --renormalize .` as its own commit per
   repo. Without this every CI diff is unreadable.
2. Commit the three workstreams separately (client items 19–23, MySQL 8.4 compat,
   containerisation) — backend and frontend as separate commits, never mixed.
3. Fix or delete `deploy.bat`. It still points at `47.245.98.149`, the decommissioned box.
4. Create a non-root deploy user on the server with **key-based** SSH. Right now the box
   accepts password auth only, as root. No CI runner can deploy into that, and you would
   not want one that could.

Step 4 is not optional for CD and is worth doing regardless.

---

## 3. The real problem is *where* you build, not whether it's automated

This is the part generic CI/CD advice will miss for your setup.

Today's deploy is `docker compose up -d --build` **on the server**. That means `npm install`
and `npm run build` — producing a 13 MB bundle — execute on a box with 8 GB of RAM that is
**shared with Shanu's IKF production stack**. A frontend build is the most memory-hungry
thing either of you runs, and it runs in production, next to someone else's live app.

That is the thing to fix. It happens to be fixed by CI, but the win is the relocation, not
the automation:

> **Build images in CI → push to a registry → the server only pulls.**

The server stops needing Node, stops needing build RAM, and a deploy becomes a pull and a
restart measured in seconds. This alone justifies the work.

Two changes make it possible:

**Tag by commit SHA, not `latest`.** `docker-compose.yml` currently declares
`image: tta-backend:latest` and `tta-frontend:latest`. `:latest` means there is no such
thing as "the previous version", so **there is no rollback**. Today rolling back means
checking out an older commit on the server and rebuilding — slow, and it re-runs the build
you were trying to avoid. Tagged images turn rollback into changing one variable and
restarting.

**Split the compose file.** Keep `build:` for local development; the server's compose
should carry `image:` only, pinned to a tag.

---

## 4. Five hazards specific to your situation

**Two repos, one deployable unit.** Frontend and backend deploy together — items 19, 20 and
23 each need both halves, and `invoiceDriveLink` additionally needs migration `0005`. A
naive per-repo pipeline will happily ship the frontend without its backend, which is exactly
the failure already flagged: the invoice field accepts input and silently discards it. Either
gate the frontend release on a backend version, or make the frontend tolerate missing fields.
Do not let two independent pipelines decide this on their own.

**Migrations run automatically on every container start.** `docker-entrypoint.sh` runs
`migrate --no-input` before gunicorn. That is fine for a hand-driven deploy where you are
watching. Combined with automated deploy it means **every merge migrates production
unattended, with no gate and no backup.** Your database is 98.6% irreplaceable base64
attachments and your only dump is from 23 July. Automated deploy without an automated
pre-deploy dump is the genuinely dangerous combination here — more so than any code defect
in this repo.

**The box is shared.** The TTA backend is attached to IKF's `football_default` network as an
external network, and both apps sit behind the same host nginx. A pipeline that restarts
containers or reloads nginx has a blast radius that includes Shanu's production. Agree the
rules with him before anything runs unattended.

**There is no staging.** Whatever you build, its first automated deployment target would be
production, on a system that has been live for three days. At minimum, keep a human between
the pipeline and prod until the deploy path has been exercised a few times by hand.

**Registry reachability.** The server is Alibaba Cloud and its clock reports CST. If it sits
in a mainland China region, pulls from `ghcr.io` and Docker Hub are slow or unreliable, and
Alibaba Container Registry is the pragmatic choice instead. Verify before committing to a
registry — this is cheap to check and expensive to discover late:

```bash
time docker pull hello-world
```

---

## 5. What not to build

- **Kubernetes.** Already decided against. Correct. Two apps, two people, 11 users.
- **Blue-green or canary.** The user base is 11 people who know each other. A 30-second
  restart is not an outage worth engineering around.
- **Auto-deploy to production on merge.** Not until the deploy path has been run by hand
  enough times to be boring, and not until a staging target exists.
- **Multi-stage approval gates, changelogs, release bots.** Overhead that will not survive
  contact with a two-person team.

The honest 80/20 for your scale is: tests as a gate, images built off the prod box,
versioned tags, a dump before every migrate, and a rollback you have actually practised.
That is perhaps two days of work and it removes every operational failure mode you have hit
so far.

---

## 6. Suggested sequence

**Phase 0 — unblock (do this regardless of CI/CD)**
Line endings normalised · three workstreams committed · `deploy.bat` fixed or deleted ·
key-based deploy user on the server.

**Phase 1 — CI only, zero risk**
Fix the `--settings` flag on the backend workflow so it goes green. Add an equivalent
frontend workflow: `npm ci`, `npm run lint`, `npm test`, `npm run build`. Nothing deploys.
The only new rule is that main must stay green. *This is worth doing this week.*

**Phase 2 — build images in CI**
On push to `main`, build both images, tag `:<git-sha>` and `:latest`, push to the registry.
Server compose switches to `image:` only. Still nobody deploys automatically — but the
server stops building, which is the single biggest operational win available to you.

**Phase 3 — one-button deploy**
A `workflow_dispatch` job that takes a tag and, in order: dumps the database to a timestamped
file, SSHes as the deploy user, pulls the tag, `docker compose up -d`, then curls `/` and
`/api/` and fails loudly if either is not 200. Rollback is the same job with the previous tag.
Human-triggered, so you keep the judgement and lose the typing.

**Phase 4 — only if it earns its keep**
Staging environment, then auto-deploy to staging on merge, prod still gated. At 11 users you
may find Phase 3 is genuinely where this should stop.

---

## Verdict

CI/CD is the right direction, and the containerisation transition is exactly the moment to
do it — you are already paying the cost of Docker, and you have not yet paid for the parts
that make Docker worth it (reproducible builds, versioned images, fast rollback).

But the framing "let's start CI/CD" understates one thing and overstates another. It
understates that **you already have CI and it is broken**, which is a worse position than
having none. And it overstates the value of automated deployment: the deploy path has been
executed exactly once, it needed a hand-patch on the server, and the repo drifted from the
server as a result. You cannot usefully automate a process you have not yet performed
reliably by hand.

Get Phase 0 and Phase 1 done first. They are cheap, they are risk-free, and they will make
Phases 2 and 3 obvious rather than speculative.
