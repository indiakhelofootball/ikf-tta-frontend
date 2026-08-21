// The Venue column on the Trials Report SCREEN.
//
// The value saves (REPModal has a "Ground Name" input, trials/views.py stores
// it) and both exports print it under a "Venue" header. But the on-screen table
// never rendered that column, so a user who filled in a Ground Name saw it in
// the export and not on the screen they filled it in from.
//
// These tests pin the screen and the export to the SAME field, which is the
// point of the fix: if a future edit repoints one of them, the drift test below
// fails rather than shipping a report whose two halves disagree.

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// react-router-dom v7 does not resolve under jest in this repo at all, so the
// mock has to be `virtual` — a plain jest.mock fails with "Cannot find module"
// before it can substitute anything. The component only needs useNavigate, for
// the back button.
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });

jest.mock('../../services/api', () => ({
  reportsAPI: { trials: jest.fn() },
}));

jest.mock('../../utils/csv', () => ({ csvBlob: jest.fn(() => new Blob()) }));

jest.mock('../../utils/reportExcel', () => ({
  exportReportExcel: jest.fn(),
  datedFileName: jest.fn(() => 'trials_report_test'),
}));

const { reportsAPI } = require('../../services/api');
const { exportReportExcel } = require('../../utils/reportExcel');

const TrialsReport = require('./TrialsReport').default;

// ── Fixture ─────────────────────────────────────────────────────────────────
//
// One project, three cities:
//   Kota    — REP assignment carries a Ground Name  -> Venue must show it
//   Mathura — REP assigned, no Ground Name          -> Venue must be blank
//   Jaipur  — no REP at all                         -> Venue must be blank

const VENUE = 'Sawai Man Singh Stadium';

const trialsResponse = {
  trials: [
    {
      id: 1,
      trialName: 'IKF Season 6',
      trialType: 'Open',
      season: 'Season 6',
      assignedCities: [
        { cityName: 'Kota', state: 'Rajasthan', tentativeDate: '2026-09-10', confirmed: true },
        { cityName: 'Mathura', state: 'Uttar Pradesh', tentativeDate: '2026-09-11', confirmed: true },
        { cityName: 'Jaipur', state: 'Rajasthan', tentativeDate: '2026-09-12', confirmed: false },
      ],
    },
  ],
  reps: [
    {
      repName: 'Kota Sports Academy',
      cityAssignments: [
        {
          trialId: 1,
          city: 'Kota',
          groundLocation: VENUE,
          physicalAddress: '12 Station Road, Kota, Rajasthan',
          pinCode: '324001',
          googleMapLink: 'https://maps.google.com/?q=kota',
        },
      ],
    },
    {
      repName: 'Mathura Foundation',
      cityAssignments: [
        {
          trialId: 1,
          city: 'Mathura',
          groundLocation: '',
          physicalAddress: '4 Temple Lane, Mathura, Uttar Pradesh',
          pinCode: '281001',
          googleMapLink: '',
        },
      ],
    },
  ],
};

const headerTexts = () => {
  // The detail table is the last table on the page (the month matrix is first).
  const tables = document.querySelectorAll('table');
  const detail = tables[tables.length - 1];
  return [...detail.querySelectorAll('thead th')].map((th) => th.textContent.trim());
};

const detailRow = (cityName) => {
  const tables = document.querySelectorAll('table');
  const detail = tables[tables.length - 1];
  const row = [...detail.querySelectorAll('tbody tr')].find((tr) =>
    [...tr.querySelectorAll('td')].some((td) => td.textContent.trim() === cityName)
  );
  if (!row) throw new Error(`no detail row for city ${cityName}`);
  return [...row.querySelectorAll('td')].map((td) => td.textContent.trim());
};

const renderReport = async () => {
  reportsAPI.trials.mockResolvedValue(trialsResponse);
  render(<TrialsReport />);
  await waitFor(() => expect(headerTexts().length).toBeGreaterThan(0));
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Trials Report — on-screen Venue column', () => {
  it('renders a Venue column header in the detail table', async () => {
    await renderReport();
    expect(headerTexts()).toContain('Venue');
  });

  it('places Venue between City and Address, matching the export order', async () => {
    await renderReport();
    const headers = headerTexts();
    expect(headers.indexOf('Venue')).toBe(headers.indexOf('City') + 1);
    expect(headers.indexOf('Address')).toBe(headers.indexOf('Venue') + 1);
  });

  it('shows the ground name from the REP city assignment', async () => {
    await renderReport();
    const headers = headerTexts();
    expect(detailRow('Kota')[headers.indexOf('Venue')]).toBe(VENUE);
  });

  it('shows the venue as its own cell, not folded into the Address cell', async () => {
    // The whole reported symptom is that the venue was invisible on screen.
    // Asserting only "the text appears somewhere" would pass if the venue were
    // concatenated into the address, which is the exact mistake the export
    // builder's comment warns about.
    await renderReport();
    const headers = headerTexts();
    const row = detailRow('Kota');
    expect(row[headers.indexOf('Venue')]).toBe(VENUE);
    expect(row[headers.indexOf('Address')]).not.toContain(VENUE);
  });

  it('leaves Venue blank when the assignment has no ground name', async () => {
    // Most live rows look like this — the field is new. A blank cell is correct
    // here, and must not fall back to the address.
    await renderReport();
    const headers = headerTexts();
    const row = detailRow('Mathura');
    expect(row[headers.indexOf('Venue')]).toBe('—');
    expect(row[headers.indexOf('Address')]).toContain('Temple Lane');
  });

  it('leaves Venue blank for a city with no REP assignment at all', async () => {
    await renderReport();
    const headers = headerTexts();
    expect(detailRow('Jaipur')[headers.indexOf('Venue')]).toBe('—');
  });

  it('keeps every body row the same width as the header row', async () => {
    // The empty-state cell and the data rows both have to track the new column
    // count. A stale colSpan is the classic thing this fix breaks.
    await renderReport();
    const width = headerTexts().length;
    ['Kota', 'Mathura', 'Jaipur'].forEach((city) => {
      expect(detailRow(city)).toHaveLength(width);
    });
  });

  it('shows the same Venue value on screen as the Excel export writes', async () => {
    // The anti-drift test. Both sides must read one field.
    await renderReport();

    act(() => { screen.getByRole('button', { name: /excel/i }).click(); });

    await waitFor(() => expect(exportReportExcel).toHaveBeenCalled());
    const call = exportReportExcel.mock.calls[0][0];
    const exportHeaders = call.columns.map((c) => (typeof c === 'string' ? c : c.header));
    const venueCol = exportHeaders.indexOf('Venue');
    expect(venueCol).toBeGreaterThan(-1);

    const kotaExportRow = call.rows.find((r) => r.includes('Kota'));
    const screenHeaders = headerTexts();
    expect(kotaExportRow[venueCol]).toBe(VENUE);
    expect(detailRow('Kota')[screenHeaders.indexOf('Venue')]).toBe(kotaExportRow[venueCol]);
  });

  it('finds a row by its venue when searching, and shows it in the Venue cell', async () => {
    // The search already matched r.location before this fix, which meant a
    // venue search hid every other row and still showed the user nothing to
    // explain why. Column plus search is the behaviour that makes sense.
    await renderReport();
    const headers = headerTexts();
    const box = screen.getByPlaceholderText(/search/i);

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set;
    act(() => {
      setter.call(box, 'Sawai Man Singh');
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await waitFor(() => {
      const tables = document.querySelectorAll('table');
      const detail = tables[tables.length - 1];
      expect(detail.querySelectorAll('tbody tr')).toHaveLength(1);
    });
    expect(detailRow('Kota')[headers.indexOf('Venue')]).toBe(VENUE);
  });
});
