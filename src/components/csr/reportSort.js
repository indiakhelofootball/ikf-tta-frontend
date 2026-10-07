// One ordering for every list of CSR reports. The cross-grant Reports page and
// a grant's own Reports tab both sort through here, so the two lists cannot
// drift apart (26 Aug review: "10-12 report ... वो report कहाँ दिखाओगे?";
// answered 3 Sep: "you can add multiple sort").

export const DEFAULT_REPORT_SORT = 'newest';

const REPORT_SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'type', label: 'By report type' },
  { value: 'activity', label: 'By activity' },
  { value: 'grant', label: 'By grant' },
];

// Inside one grant every row has the same grant, so that option says nothing.
export const reportSortOptions = ({ withGrant = true } = {}) =>
  (withGrant ? REPORT_SORTS : REPORT_SORTS.filter((o) => o.value !== 'grant'));

// Character for character the comparator CSRReportsPage sorted with before
// there was a choice. The default order must not move for anyone.
const newestFirst = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

// A blank goes to the bottom in either direction: an undated or unnamed report
// is not the "oldest" or the "first alphabetically", it is unknown.
const blanksLast = (x, y) => (x ? 0 : 1) - (y ? 0 : 1);

const oldestFirst = (a, b) => {
  const x = String(a.createdAt || '');
  const y = String(b.createdAt || '');
  if (!x || !y) return blanksLast(x, y);
  return x.localeCompare(y);
};

const text = (v) => (v == null ? '' : String(v).trim());

// Case-blind, and "Report 2" before "Report 10".
const byText = (get, dir = 1) => (a, b) => {
  const x = text(get(a));
  const y = text(get(b));
  if (!x || !y) return blanksLast(x, y);
  return dir * x.localeCompare(y, undefined, { sensitivity: 'base', numeric: true });
};

const thenNewest = (compare) => (a, b) => compare(a, b) || newestFirst(a, b);

// The name both lists print on the row is fileName, so that is what a name
// sort orders by -- sorting on a field the row does not show would look random.
const reportName = (r) => r.fileName;

// activityName / grantName take the report and return the label the screen
// shows for it; neither is on the report row itself (it carries ids only).
// Array.prototype.sort is stable, so reports tied on every key keep the order
// they arrived in.
export function sortReports(list, sortKey, { activityName = () => '', grantName = () => '' } = {}) {
  const compare = {
    newest: newestFirst,
    oldest: oldestFirst,
    'name-asc': thenNewest(byText(reportName)),
    'name-desc': thenNewest(byText(reportName, -1)),
    type: thenNewest(byText((r) => r.reportType)),
    activity: thenNewest(byText(activityName)),
    grant: thenNewest(byText(grantName)),
  }[sortKey] || newestFirst;
  return [...(list || [])].sort(compare);
}
