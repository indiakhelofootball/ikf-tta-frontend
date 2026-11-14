import * as XLSX from 'xlsx';
import {
  ATHLETE_CATEGORIES, buildTemplateWorkbook, categoryFromDob, fieldForHeader,
  rowsFromSheet, rowsFromWorkbook, TEMPLATE_HEADERS, toIsoDate,
} from './athleteImport';

test('categories are one style', () => {
  expect(ATHLETE_CATEGORIES).toEqual(['U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Senior']);
});

test('the category comes from the age on the grant start date, in the same bands', () => {
  const start = '2026-04-01';
  expect(categoryFromDob('2015-04-01', start)).toBe('U11');
  expect(categoryFromDob('2013-04-01', start)).toBe('U13');
  expect(categoryFromDob('2011-04-01', start)).toBe('U15');
  expect(categoryFromDob('2008-06-01', start)).toBe('U17');
  expect(categoryFromDob('2007-04-01', start)).toBe('U19');
  expect(categoryFromDob('2005-04-01', start)).toBe('U21');
  expect(categoryFromDob('2004-04-01', start)).toBe('Senior');
  expect(categoryFromDob('', start)).toBe('');
});

test('headers map ignoring case, spaces and punctuation', () => {
  expect(fieldForHeader('DOB')).toBe('dob');
  expect(fieldForHeader('Date of birth')).toBe('dob');
  expect(fieldForHeader('date_of_birth')).toBe('dob');
  expect(fieldForHeader('Name')).toBe('fullName');
  expect(fieldForHeader('Full name')).toBe('fullName');
  expect(fieldForHeader('School/Club')).toBe('schoolOrClub');
  expect(fieldForHeader('Jersey No')).toBe('jerseyNumber');
  expect(fieldForHeader('Jersey No.')).toBe('jerseyNumber');
  expect(fieldForHeader('Shoe size')).toBeNull();
  TEMPLATE_HEADERS.forEach((h) => expect(fieldForHeader(h)).not.toBeNull());
});

test('dates become YYYY-MM-DD; an unreadable one is sent as typed', () => {
  expect(toIsoDate(40000)).toBe('2009-07-06');
  expect(toIsoDate(7306)).toBe('1920-01-01');
  expect(toIsoDate('15/08/2010')).toBe('2010-08-15');
  expect(toIsoDate('15-08-2010')).toBe('2010-08-15');
  expect(toIsoDate('2010-8-5')).toBe('2010-08-05');
  expect(toIsoDate('31/02/2010')).toBe('31/02/2010');
  expect(toIsoDate('next week')).toBe('next week');
  expect(toIsoDate('')).toBe('');
});

test('a bare year or a small number in the date column is sent as typed, not as a date', () => {
  expect(toIsoDate(2010)).toBe('2010');
  expect(toIsoDate(1900)).toBe('1900');
  expect(toIsoDate(2100)).toBe('2100');
  expect(toIsoDate(7305)).toBe('7305');
  expect(toIsoDate(15)).toBe('15');
});

test('rows carry every field, skip blank lines, and keep their spreadsheet row number', () => {
  const out = rowsFromSheet([
    ['Name', 'DOB', 'Gender', 'Category', 'Jersey No', 'Status', 'Shoe size'],
    ['Manpreet Singh', '01/06/2008', 'male', 'U-17', 10, 'Shortlisted in Trials', 9],
    ['', '', '', '', '', '', ''],
    [' Simran Kaur ', 40000, 'Female', '', '', '', ''],
  ]);
  expect(out.error).toBeUndefined();
  expect(out.sheetRows).toEqual([2, 4]);
  expect(out.rows[0]).toEqual({
    fullName: 'Manpreet Singh', dob: '2008-06-01', gender: 'Male', category: 'U17',
    position: '', status: 'Shortlisted', jerseyNumber: '10', schoolOrClub: '', city: '', notes: '',
  });
  expect(out.rows[1]).toMatchObject({ fullName: 'Simran Kaur', dob: '2009-07-06', category: '' });
});

test('no Full Name column is refused', () => {
  expect(rowsFromSheet([['DOB', 'City'], ['2010-01-01', 'Pune']]).error).toMatch(/Full Name column/);
});

test('more than 2000 rows is refused', () => {
  const aoa = [['Full Name']];
  for (let i = 0; i < 2001; i += 1) aoa.push([`Player ${i}`]);
  expect(rowsFromSheet(aoa).error).toMatch(/at most 2000/);
  expect(rowsFromSheet(aoa.slice(0, 2001)).rows).toHaveLength(2000);
});

test('the template has the Athletes headers and an Allowed values sheet', async () => {
  const wb = await buildTemplateWorkbook();
  expect(wb.SheetNames).toEqual(['Athletes', 'Allowed values']);
  const head = XLSX.utils.sheet_to_json(wb.Sheets.Athletes, { header: 1 })[0];
  expect(head).toEqual([
    'Full Name', 'Date of Birth', 'Gender', 'Category', 'Position', 'Status',
    'Jersey Number', 'School or Club', 'City', 'Notes',
  ]);
  const allowed = XLSX.utils.sheet_to_json(wb.Sheets['Allowed values'], { header: 1 });
  const column = (i) => allowed.slice(1).map((r) => r[i]).filter(Boolean);
  expect(allowed[0]).toEqual(['Gender', 'Category', 'Status']);
  expect(column(0).slice(0, 4)).toEqual(['Male', 'Female', 'Other', 'Not Mentioned']);
  expect(column(1).slice(0, 7)).toEqual(ATHLETE_CATEGORIES);
  expect(column(2).slice(0, 4)).toEqual(['Participated', 'Shortlisted', 'Scholarship Awarded', 'National Finals']);
  expect(allowed.flat().join(' ')).toMatch(/Date of Birth as YYYY-MM-DD\. Leave Category blank/);
});

test('a written workbook reads back through the same path the upload uses', async () => {
  const wb = await buildTemplateWorkbook();
  XLSX.utils.sheet_add_aoa(wb.Sheets.Athletes, [['Ravi Kumar', '2010-01-15']], { origin: 'A2' });
  const out = await rowsFromWorkbook(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  expect(out.rows).toHaveLength(1);
  expect(out.rows[0]).toMatchObject({ fullName: 'Ravi Kumar', dob: '2010-01-15' });
  expect(out.sheetRows).toEqual([2]);
});
