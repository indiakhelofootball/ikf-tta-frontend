// A4: forms return staff to the grant tab their record lives on, by position.
// The positions must match the order the grant page draws its tabs in, or a
// save would land on the wrong tab without anything failing.
import fs from 'fs';
import path from 'path';
import { GRANT_TABS, grantTabState } from './grantTabs';

const src = fs.readFileSync(path.join(__dirname, 'CSRProjectDetailPage.jsx'), 'utf8');

test('the tab positions match the order the grant page draws its tabs in', () => {
  const drawn = [...src.matchAll(/<Tab label=(?:"([^"]+)"|\{tabCount\('([^']+)')/g)]
    .map((m) => (m[1] || m[2]).toLowerCase());
  const named = Object.entries(GRANT_TABS).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  expect(drawn).toEqual(named);
});

test('the state carries the tab, and the save message only when there is one', () => {
  expect(grantTabState(GRANT_TABS.reports, 'Report filed.')).toEqual({ state: { saved: 'Report filed.', tab: 3 } });
  expect(grantTabState(GRANT_TABS.activities)).toEqual({ state: { tab: 2 } });
});
