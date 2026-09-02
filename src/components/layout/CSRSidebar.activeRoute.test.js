// The rail decides which nav item is "active" by ranking the current path
// against CSR_ROUTES in CSRSidebar.jsx. Any static /csr route missing from that
// table loses to `/csr/:id`, which the rail reads as a project detail page and
// answers by force-lighting Projects — so /csr/reports lit up Reports AND
// Projects at once. Activities, Reports and Utilisation were added to the rail
// in fc79dbb and never added to the table.
//
// This asserts the invariant directly from the two sources rather than through
// the router (react-router-dom does not resolve under Jest here, which is why
// the other CSR tests mock it virtually). It fails the moment a /csr page is
// added to App.js and not to the rail's table.
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

const staticCsrRoutesIn = (src) => {
  const found = new Set();
  const re = /path="(\/csr\/[^"]+)"/g;
  let m = re.exec(src);
  while (m) {
    if (!m[1].includes(':')) found.add(m[1]);
    m = re.exec(src);
  }
  return found;
};

// /csr/login is a front door, not a destination inside the shell — it renders
// outside DashboardLayout and has no rail to light up.
const NOT_IN_THE_SHELL = ['/csr/login'];

test('every static /csr route App.js renders is known to the rail', () => {
  const appRoutes = staticCsrRoutesIn(read('../../App.js'));
  const railTable = read('./CSRSidebar.jsx');

  expect(appRoutes.size).toBeGreaterThan(5);

  const missing = [...appRoutes]
    .filter((r) => !NOT_IN_THE_SHELL.includes(r))
    .filter((r) => !railTable.includes(`{ path: '${r}' }`));

  expect(missing).toEqual([]);
});

test('the rail still keeps the dynamic project route last', () => {
  const railTable = read('./CSRSidebar.jsx');
  const paths = [...railTable.matchAll(/\{ path: '([^']+)' \}/g)].map((m) => m[1]);

  expect(paths).toContain('/csr/:id');
  expect(paths[paths.length - 1]).toBe('/csr/:id');
});
