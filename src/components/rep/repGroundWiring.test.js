// WIRING tests — not unit tests.
//
// REPModal.jsx reaches react-router-dom through AuthContext, which CRA's Jest
// resolver cannot load, so it cannot be imported here. These read the source
// and assert the Reporting Time field is actually wired into the shared ground
// section. Same pattern, and the same normalise(), as courierWiring.test.js.
//
// TC-REP-07: the box existed only in the Add-REP form's inline copy of the
// ground fields. Both EDIT paths — editing an existing assignment, and adding
// an assignment to an existing REP — render renderGroundSection() instead, and
// that function had no Reporting Time. So a time recorded at creation could
// never afterwards be corrected. Part of the 29 Jun request.
import fs from 'fs';
import path from 'path';

// Erases exactly what prettier is free to change and nothing else, so an
// assertion can only fail when the WIRING changed.
const normalise = (src) =>
  src
    .replace(/\r\n/g, '\n')
    .replace(/'/g, '"')
    .replace(/\s+/g, '')
    .replace(/\((\w+)\)=>/g, '$1=>')
    .replace(/,(?=[)\]}])/g, '');

const raw = fs.readFileSync(path.join(__dirname, 'REPModal.jsx'), 'utf8');
const src = normalise(raw);
const wires = (snippet) => src.includes(normalise(snippet));

// The body of renderGroundSection, isolated so a Reporting Time field sitting
// in the Add-REP form cannot satisfy a test about the shared one.
const groundSection = normalise(
  raw.slice(raw.indexOf('function renderGroundSection'))
);

describe('TC-REP-07 — Reporting Time is editable, not add-only', () => {
  test('renderGroundSection renders a Reporting Time input', () => {
    expect(groundSection).toContain(normalise('<Typography sx={labelSx}>Reporting Time</Typography>'));
  });

  test('that input is bound to data.reportingTime, both ways', () => {
    expect(groundSection).toContain(normalise('value={data.reportingTime}'));
    expect(groundSection).toContain(normalise("onChange={onChange('reportingTime')}"));
  });

  test('openEditAssignment seeds reportingTime from the stored assignment', () => {
    // Without the seed the field opens uncontrolled and React warns. The save
    // itself is safe either way — manage_assignment uses partial=True — but an
    // unseeded controlled input is the trap the groundLocation comment records.
    expect(wires("reportingTime: a.reportingTime || ''")).toBe(true);
  });

  test('both edit paths go through renderGroundSection, so one fix covers both', () => {
    const calls = raw.match(/renderGroundSection\(/g) || [];
    // 1 declaration + 2 call sites: editing an existing assignment, and adding
    // one to an existing REP. The Add-REP form keeps its own inline copy of the
    // ground fields and is NOT covered by this function -- it already had the
    // Reporting Time box, which is why the gap was edit-only.
    expect(calls.length).toBe(3);
  });
});
