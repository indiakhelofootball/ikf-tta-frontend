// Loaded on use, so the spreadsheet library stays out of the main staff bundle.
const loadXlsx = () => import('xlsx');

export const ATHLETE_CATEGORIES = ['U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Senior'];
// CSRAthlete.GENDER_CHOICES and STATUS_CHOICES (backend/csr/models.py).
export const ATHLETE_GENDERS = ['Male', 'Female', 'Other', 'Not Mentioned'];
export const ATHLETE_STATUSES = ['Participated', 'Shortlisted', 'Scholarship Awarded', 'National Finals'];
const STATUS_LABELS = {
  shortlistedintrials: 'Shortlisted',
  selectedfornationalfinals: 'National Finals',
};

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
// 1 Jan 1920 as an Excel day number. A smaller number in the date column is a
// bare year or a typo, not a date, and is sent as typed for the server to refuse.
const FIRST_DATE_SERIAL = 7306;

// An athlete's category is fixed by their age when the grant started, not by
// today's date, or every player would move up a band each birthday after the
// trial. Only a suggestion: staff can change it before saving.
export const categoryFromDob = (dob, startDate) => {
  const birth = new Date(dob);
  if (!dob || isNaN(birth.getTime())) return '';
  const start = startDate ? new Date(startDate) : null;
  const on = start && !isNaN(start.getTime()) ? start : new Date();
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  if (age < 0 || age > 100) return '';
  if (age <= 11) return 'U11';
  if (age <= 13) return 'U13';
  if (age <= 15) return 'U15';
  if (age <= 17) return 'U17';
  if (age <= 19) return 'U19';
  if (age <= 21) return 'U21';
  return 'Senior';
};

export const TEMPLATE_HEADERS = [
  'Full Name', 'Date of Birth', 'Gender', 'Category', 'Position', 'Status',
  'Jersey Number', 'School or Club', 'City', 'Notes',
];

export const FIELD_LABELS = {
  fullName: 'Full Name', dob: 'Date of Birth', gender: 'Gender', category: 'Category',
  position: 'Position', status: 'Status', jerseyNumber: 'Jersey Number',
  schoolOrClub: 'School or Club', city: 'City', notes: 'Notes',
};

const FIELDS = Object.keys(FIELD_LABELS);

const key = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const HEADER_ALIASES = {
  fullName: ['fullname', 'name', 'athletename', 'playername', 'athlete', 'player'],
  dob: ['dob', 'dateofbirth', 'birthdate', 'dateofbirthyyyymmdd', 'dobyyyymmdd'],
  gender: ['gender', 'sex'],
  category: ['category', 'agecategory', 'agegroup'],
  position: ['position', 'playingposition'],
  status: ['status'],
  jerseyNumber: ['jerseynumber', 'jerseyno', 'jersey', 'jerseynum', 'shirtnumber'],
  schoolOrClub: [
    'schoolorclub', 'schoolclub', 'school', 'club', 'academy',
    'schoolclubacademy', 'schoolorclubacademy',
  ],
  city: ['city'],
  notes: ['notes', 'note', 'remarks', 'remark'],
};

const ALIAS_TO_FIELD = Object.entries(HEADER_ALIASES).reduce((acc, [field, aliases]) => {
  aliases.forEach((a) => { acc[a] = field; });
  return acc;
}, {});

export const fieldForHeader = (header) => ALIAS_TO_FIELD[key(header)] || null;

const pad = (n) => String(n).padStart(2, '0');

const validYmd = (y, m, d) => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};

// Excel counts days from 30 Dec 1899 (its 1900 leap-year bug folded in).
const fromSerial = (n) => {
  const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

// YYYY-MM-DD, or the text as typed so the server names what is wrong with it.
export const toIsoDate = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === 'number') return Number.isFinite(value) && value >= FIRST_DATE_SERIAL ? fromSerial(value) : String(value);
  const text = String(value).trim();
  if (!text) return '';
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (m) return validYmd(Number(m[1]), Number(m[2]), Number(m[3])) || text;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (m) return validYmd(Number(m[3]), Number(m[2]), Number(m[1])) || text;
  return text;
};

const matchChoice = (value, choices, labels = {}) => {
  const k = key(value);
  if (!k) return '';
  return choices.find((c) => key(c) === k) || labels[k] || value;
};

const cellText = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return toIsoDate(v);
  return String(v).trim();
};

// Rows as arrays, the header first. `firstRow` is the spreadsheet row number
// of that header, so each athlete can be named by the row a person sees.
export const rowsFromSheet = (aoa, firstRow = 1) => {
  const [header = [], ...body] = aoa || [];
  const columns = header.map(fieldForHeader);
  if (!columns.includes('fullName')) {
    return { error: 'No Full Name column was found. Use the template\'s header row.' };
  }
  const rows = [];
  const sheetRows = [];
  body.forEach((cells, i) => {
    if (!cells || cells.every((c) => cellText(c) === '')) return;
    const row = FIELDS.reduce((acc, f) => ({ ...acc, [f]: '' }), {});
    columns.forEach((field, c) => {
      if (!field || row[field] !== '') return;
      const raw = cells[c];
      row[field] = field === 'dob' ? toIsoDate(raw) : cellText(raw);
    });
    row.gender = matchChoice(row.gender, ATHLETE_GENDERS);
    row.category = matchChoice(row.category, ATHLETE_CATEGORIES);
    row.status = matchChoice(row.status, ATHLETE_STATUSES, STATUS_LABELS);
    rows.push(row);
    sheetRows.push(firstRow + i + 1);
  });
  if (rows.length === 0) return { error: 'The file has no athlete rows.' };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: `The file has ${rows.length} athlete rows. Upload at most ${MAX_IMPORT_ROWS} at a time.` };
  }
  return { rows, sheetRows };
};

export const rowsFromWorkbook = async (data) => {
  const XLSX = await loadXlsx();
  let wb;
  try {
    wb = XLSX.read(data, { type: 'array' });
  } catch {
    return { error: 'This file could not be read as an Excel workbook.' };
  }
  const name = wb.SheetNames.find((n) => key(n) === 'athletes') || wb.SheetNames[0];
  const ws = name ? wb.Sheets[name] : null;
  if (!ws || !ws['!ref']) return { error: 'The file has no athlete rows.' };
  const start = XLSX.utils.decode_range(ws['!ref']).s.r + 1;
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
  return rowsFromSheet(aoa, start);
};

export const buildTemplateWorkbook = async () => {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]), 'Athletes');
  const longest = Math.max(ATHLETE_GENDERS.length, ATHLETE_CATEGORIES.length, ATHLETE_STATUSES.length);
  const allowed = [['Gender', 'Category', 'Status']];
  for (let i = 0; i < longest; i += 1) {
    allowed.push([ATHLETE_GENDERS[i] || '', ATHLETE_CATEGORIES[i] || '', ATHLETE_STATUSES[i] || '']);
  }
  allowed.push([]);
  allowed.push(['Date of Birth as YYYY-MM-DD. Leave Category blank to fill it from age on the grant start date. Full Name is required.']);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allowed), 'Allowed values');
  return wb;
};

export const downloadTemplate = async () => {
  const XLSX = await loadXlsx();
  XLSX.writeFile(await buildTemplateWorkbook(), 'athletes-template.xlsx');
};

export const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result));
  reader.onerror = () => reject(reader.error || new Error('The file could not be read.'));
  reader.readAsArrayBuffer(file);
});
