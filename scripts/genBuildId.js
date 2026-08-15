// Writes REACT_APP_BUILD_ID / REACT_APP_BUILD_TIME into .env.production.local so
// the running app can identify which build a user is actually on. Runs as the
// `prebuild` npm script, i.e. before every `npm run build`.
//
// Why a generated env file: CRA only inlines REACT_APP_* vars that exist at build
// time, and the Docker build context excludes .git (see .dockerignore), so the
// hash cannot be read from git inside the image. Order of preference:
//   1. BUILD_ID env var  — how Docker passes it in (ARG BUILD_ID)
//   2. git short hash    — local builds
//   3. 'unknown'         — neither available; still stamped with a time
//
// This OVERWRITES .env.production.local. Nothing else currently uses that file;
// if production-only vars are ever added there, merge instead of replacing.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function resolveBuildId() {
  if (process.env.BUILD_ID) return process.env.BUILD_ID.trim();
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function isDirty() {
  if (process.env.BUILD_ID) return false;
  try {
    const out = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

// A build made from a modified tree is NOT the commit it claims to be — mark it,
// because prod has been deployed from working-tree bundles before.
const buildId = resolveBuildId() + (isDirty() ? '-dirty' : '');
const buildTime = new Date().toISOString();

const target = path.resolve(__dirname, '..', '.env.production.local');
fs.writeFileSync(
  target,
  `REACT_APP_BUILD_ID=${buildId}\nREACT_APP_BUILD_TIME=${buildTime}\n`,
  'utf8'
);

console.log(`[genBuildId] ${buildId} @ ${buildTime}`);
