/* eslint-disable no-console */
// Strip internal artefacts out of the funder bundle after `build:client`.
//
// CRA copies everything in public/ into every build, so the funder tree inherits
// files that belong to the staff app. That is not hypothetical: it shipped
// templates/NPAB_FMT_DDMMYY.xls — an ICICI bulk-payment workbook with a
// populated DEBIT_ACC_NO — downloadable, unauthenticated, at
// /client/templates/. The funder bundle never references it; it was there purely
// because public/ is copied wholesale.
//
// The entry split in craco.config.js stops internal *code* reaching the funder.
// This is the same guarantee for internal *files*.
//
// Verified by scripts/verify-client-build.sh, which fails closed.

const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'build-client');

if (!fs.existsSync(OUT)) {
  console.error('sanitiseClientBuild: build-client/ not found — nothing to do.');
  process.exit(0);
}

const rm = (rel, why) => {
  const target = path.join(OUT, rel);
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`  removed ${rel.padEnd(24)} ${why}`);
};

// Anything in public/ that the portal does not use.
rm('templates', 'internal payment templates (live bank account number)');
rm('client.html', 'un-substituted CRA template, shipped beside the real index.html');
rm('service-worker.js', 'internal SW: never registered here, caches internal paths');
rm('asset-manifest.json', 'build metadata, of no use to a browser');

// The internal PWA manifest names five internal modules in its description,
// paints TTA amber, and sets start_url/scope to "/" — so a funder who installed
// the portal got a launcher that opened the STAFF app. Replace, do not delete:
// without it the browser falls back to the page title.
const manifest = {
  short_name: 'CSR Portal',
  name: 'CSR Portal',
  description: 'View your CSR project activities and published reports.',
  icons: [
    { src: 'favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
    { src: 'logo192.png', type: 'image/png', sizes: '192x192' },
  ],
  // Scoped to the portal so an installed app can never open the internal shell.
  start_url: '/client',
  scope: '/client',
  display: 'standalone',
  theme_color: '#FFFFFF',
  background_color: '#FFFFFF',
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('  rewrote manifest.json      scoped to /client, no internal module names');

// A funder portal has nothing to gain from being indexed, and its slug URLs
// identify the client.
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('  rewrote robots.txt         disallow all');

console.log('sanitiseClientBuild: done');
