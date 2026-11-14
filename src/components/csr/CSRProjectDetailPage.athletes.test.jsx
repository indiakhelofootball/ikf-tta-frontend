// An athlete's category is saved with the athlete, so the funder portal shows
// what staff set rather than a band worked out from today's date. The form
// suggests it from the age on the grant's start date.
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: mockId }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/csr/42', state: { tab: 'athletes' } }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
    athletes: { getAll: jest.fn(), create: jest.fn(), update: jest.fn() },
    athletesBulk: jest.fn(),
    grantTrials: jest.fn(),
  },
}));

let mockEditable = true;
let mockId = '42';
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({
    isSuper: false, canView: (m) => m === 'csr', canEdit: (m) => mockEditable && m === 'csr', permsLoading: false,
  }),
}));

jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));
jest.mock('xlsx', () => ({ ...jest.requireActual('xlsx'), writeFile: jest.fn() }));

const { csrAPI } = require('../../services/api');

beforeEach(() => {
  jest.clearAllMocks();
  mockEditable = true;
  mockId = '42';
  csrAPI.projects.getById.mockResolvedValue({
    id: 42, name: 'Football for All', clientName: 'Vardhman', status: 'Active',
    sanctionedAmount: '0', startDate: '2026-04-01',
  });
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.athletes.getAll.mockResolvedValue([]);
  csrAPI.athletes.create.mockResolvedValue({ id: 1 });
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('the saved athlete carries the category, set from the age at the grant start', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Athlete' }));
  const dialog = await screen.findByRole('dialog');

  fireEvent.change(within(dialog).getByLabelText(/Full Name/), { target: { value: 'Manpreet Singh' } });
  // 17 on 1 Apr 2026 when the grant started, 18 from 1 Jun 2026: still U17.
  fireEvent.change(within(dialog).getByLabelText('Date of Birth (DOB)'), { target: { value: '2008-06-01' } });
  expect(within(dialog).getByRole('combobox', { name: 'Category' })).toHaveTextContent('U17');

  fireEvent.click(within(dialog).getByRole('button', { name: 'Add Athlete' }));
  await waitFor(() => expect(csrAPI.athletes.create).toHaveBeenCalledTimes(1));
  expect(csrAPI.athletes.create).toHaveBeenCalledWith(expect.objectContaining({
    fullName: 'Manpreet Singh', dob: '2008-06-01', category: 'U17',
  }));
});

test('a category staff already chose is not overwritten by a DOB change', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Athlete' }));
  const dialog = await screen.findByRole('dialog');

  fireEvent.change(within(dialog).getByLabelText(/Full Name/), { target: { value: 'Simran Kaur' } });
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Category' }));
  fireEvent.click(await screen.findByRole('option', { name: 'U21' }));
  fireEvent.change(within(dialog).getByLabelText('Date of Birth (DOB)'), { target: { value: '2012-01-15' } });

  fireEvent.click(within(dialog).getByRole('button', { name: 'Add Athlete' }));
  await waitFor(() => expect(csrAPI.athletes.create).toHaveBeenCalledTimes(1));
  expect(csrAPI.athletes.create.mock.calls[0][0].category).toBe('U21');
});

// Owner, 14 Nov 2026: one style, U17.
test('the category list is one style', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Athlete' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Category' }));
  const listbox = await screen.findByRole('listbox');
  expect(within(listbox).getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Not set', 'U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Senior',
  ]);
});

test('the derived category uses the one style', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Athlete' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Date of Birth (DOB)'), { target: { value: '2015-01-10' } });
  expect(within(dialog).getByRole('combobox', { name: 'Category' })).toHaveTextContent('U11');
});

test('an athlete stored with an old-style category keeps it through an edit', async () => {
  csrAPI.athletes.getAll.mockResolvedValue([
    { id: 7, fullName: 'Old Style', category: 'U-11', gender: 'Male', status: 'Participated' },
  ]);
  csrAPI.athletes.update.mockResolvedValue({ id: 7 });
  render(<CSRProjectDetailPage />);
  const [, pencil] = await screen.findAllByRole('button', { name: 'Edit athlete Old Style' });
  fireEvent.click(pencil);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('combobox', { name: 'Category' })).toHaveTextContent('U-11');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Update Athlete' }));
  await waitFor(() => expect(csrAPI.athletes.update).toHaveBeenCalledTimes(1));
  expect(csrAPI.athletes.update.mock.calls[0][1].category).toBe('U-11');
});

describe('athletes from an Excel file', () => {
  const XLSX = require('xlsx');
  const workbookFile = (aoa) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Athletes');
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new File([bytes], 'athletes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };
  const upload = async (aoa) => {
    const view = render(<CSRProjectDetailPage />);
    await screen.findByRole('button', { name: 'Add Athlete' });
    fireEvent.change(screen.getByTestId('athlete-file'), { target: { files: [workbookFile(aoa)] } });
    return view;
  };
  const SHEET = [
    ['Full Name', 'Date of Birth', 'Category'],
    ['Manpreet Singh', '01/06/2008', ''],
    ['Simran Kaur', 'soon', ''],
    ['Ravi Kumar', '2010-01-15', 'U-17'],
  ];
  const DRY = {
    dryRun: true, total: 3, valid: 1, duplicates: 1, invalid: 1, created: 0,
    rows: [
      { row: 1, fullName: 'Manpreet Singh', category: 'U17', result: 'duplicate', errors: {} },
      { row: 2, fullName: 'Simran Kaur', category: '', result: 'error', errors: { dob: 'Enter a date as YYYY-MM-DD.' } },
      { row: 3, fullName: 'Ravi Kumar', category: 'U17', result: 'ok', errors: {} },
    ],
  };
  const CLEAN = {
    ...DRY, valid: 2, invalid: 0,
    rows: [
      { row: 1, fullName: 'Manpreet Singh', category: 'U17', result: 'duplicate', errors: {} },
      { row: 2, fullName: 'Simran Kaur', category: 'U13', result: 'ok', errors: {} },
      { row: 3, fullName: 'Ravi Kumar', category: 'U17', result: 'ok', errors: {} },
    ],
  };

  test('the template and upload sit beside Add Athlete, for exactly those who can add', async () => {
    const { unmount } = render(<CSRProjectDetailPage />);
    expect(await screen.findByRole('button', { name: 'Download template' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Excel' })).toBeInTheDocument();
    unmount();

    mockEditable = false;
    render(<CSRProjectDetailPage />);
    await screen.findByText(/Beneficiaries and scouted/);
    expect(screen.queryByRole('button', { name: 'Add Athlete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download template' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Upload Excel' })).toBeNull();
    expect(screen.queryByTestId('athlete-file')).toBeNull();
  });

  test('Download template writes the workbook with both sheets', async () => {
    const spy = XLSX.writeFile;
    render(<CSRProjectDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Download template' }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [wb, name] = spy.mock.calls[0];
    expect(name).toBe('athletes-template.xlsx');
    expect(wb.SheetNames).toEqual(['Athletes', 'Allowed values']);
  });

  test('a dry run shows the counts and the rows, errors first, by spreadsheet row', async () => {
    csrAPI.athletesBulk.mockResolvedValue(DRY);
    await upload(SHEET);

    const dialog = await screen.findByRole('dialog');
    expect(csrAPI.athletesBulk).toHaveBeenCalledWith('42', expect.any(Array), true);
    const sent = csrAPI.athletesBulk.mock.calls[0][1];
    expect(sent).toHaveLength(3);
    expect(sent[0]).toMatchObject({ fullName: 'Manpreet Singh', dob: '2008-06-01', category: '' });
    expect(sent[1].dob).toBe('soon');
    expect(sent[2].category).toBe('U17');

    expect(within(dialog).getByText(
      'Ready to add 1 · Already on this grant or repeated in the file 1 · Need fixing 1',
    )).toBeInTheDocument();
    const bodyRows = within(dialog).getAllByRole('row').slice(1);
    expect(bodyRows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['3', '2', '4']);
    expect(within(dialog).getByRole('columnheader', { name: 'Date of birth' })).toBeInTheDocument();
    expect(bodyRows.map((r) => within(r).getAllByRole('cell')[2].textContent))
      .toEqual(['soon', '2008-06-01', '2010-01-15']);
    expect(within(bodyRows[0]).getByText('Date of Birth: Enter a date as YYYY-MM-DD.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add 1 athlete' })).toBeDisabled();
  });

  test('a clean dry run enables Add; the real run closes, refreshes and reports', async () => {
    csrAPI.athletesBulk
      .mockResolvedValueOnce(CLEAN)
      .mockResolvedValueOnce({ ...CLEAN, dryRun: false, created: 2 });
    await upload(SHEET);
    const dialog = await screen.findByRole('dialog');
    const add = within(dialog).getByRole('button', { name: 'Add 2 athletes' });
    expect(add).toBeEnabled();

    csrAPI.athletes.getAll.mockResolvedValue([
      { id: 1, fullName: 'Simran Kaur', category: 'U13', status: 'Participated' },
      { id: 2, fullName: 'Ravi Kumar', category: 'U17', status: 'Participated' },
    ]);
    fireEvent.click(add);
    await waitFor(() => expect(csrAPI.athletesBulk).toHaveBeenCalledTimes(2));
    expect(csrAPI.athletesBulk.mock.calls[1][2]).toBe(false);
    expect(await screen.findByText('Added 2 athletes. Skipped 1 already listed.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(csrAPI.athletes.getAll).toHaveBeenCalledTimes(2);
  });

  test('a nothing-to-add dry run keeps Add disabled', async () => {
    csrAPI.athletesBulk.mockResolvedValue({
      ...DRY, valid: 0, invalid: 0, duplicates: 3,
      rows: DRY.rows.map((r) => ({ ...r, result: 'duplicate', errors: {} })),
    });
    await upload(SHEET);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Add 0 athletes' })).toBeDisabled();
  });

  test('a refused real run shows the row errors in the same table', async () => {
    const refused = new Error('rows: [object Object]');
    refused.response = {
      status: 400,
      data: {
        ...CLEAN, dryRun: false, valid: 1, invalid: 1, created: 0,
        rows: [
          CLEAN.rows[0],
          { row: 2, fullName: 'Simran Kaur', category: '', result: 'error', errors: { fullName: 'Already added a moment ago.' } },
          CLEAN.rows[2],
        ],
      },
    };
    csrAPI.athletesBulk.mockResolvedValueOnce(CLEAN).mockRejectedValueOnce(refused);
    await upload(SHEET);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add 2 athletes' }));

    expect(await within(dialog).findByText('Full Name: Already added a moment ago.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Nothing was saved/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add 1 athlete' })).toBeDisabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('a network failure on the real run keeps the dialog open with the message', async () => {
    csrAPI.athletesBulk.mockResolvedValueOnce(CLEAN).mockRejectedValueOnce(new Error('Failed to fetch'));
    await upload(SHEET);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add 2 athletes' }));
    expect(await within(dialog).findByText('Failed to fetch')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add 2 athletes' })).toBeEnabled();
  });

  test('a file with no Full Name column is refused without calling the server', async () => {
    await upload([['DOB', 'City'], ['2010-01-01', 'Pune']]);
    expect(await screen.findByText(/No Full Name column was found/)).toBeInTheDocument();
    expect(csrAPI.athletesBulk).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('more than 2000 rows is refused without calling the server', async () => {
    const aoa = [['Full Name'], ...Array.from({ length: 2001 }, (_, i) => [`P${i}`])];
    await upload(aoa);
    expect(await screen.findByText(/Upload at most 2000 at a time/, {}, { timeout: 15000 })).toBeInTheDocument();
    expect(csrAPI.athletesBulk).not.toHaveBeenCalled();
  }, 30000);

  test('a file over 5 MB is refused before it is read', async () => {
    const big = new File(['not a workbook'], 'big.xlsx');
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    render(<CSRProjectDetailPage />);
    await screen.findByRole('button', { name: 'Add Athlete' });
    fireEvent.change(screen.getByTestId('athlete-file'), { target: { files: [big] } });
    expect(await screen.findByText('This file is larger than 5 MB. Upload a smaller file.')).toBeInTheDocument();
    expect(screen.queryByText(/could not be read/)).toBeNull();
    expect(csrAPI.athletesBulk).not.toHaveBeenCalled();
  });

  test('Upload Excel opens the file picker from the keyboard', async () => {
    render(<CSRProjectDetailPage />);
    const button = await screen.findByRole('button', { name: 'Upload Excel' });
    const input = screen.getByTestId('athlete-file');
    const pick = jest.spyOn(input, 'click').mockImplementation(() => {});
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(pick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    expect(pick).toHaveBeenCalledTimes(2);
  });

  test('Upload Excel stays disabled while the file is checked', async () => {
    let finish;
    csrAPI.athletesBulk.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await upload(SHEET);
    expect(screen.getByRole('button', { name: 'Upload Excel' })).toBeDisabled();
    await waitFor(() => expect(csrAPI.athletesBulk).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Upload Excel' })).toBeDisabled();
    finish(CLEAN);
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Upload Excel', hidden: true })).toBeEnabled();
  });

  test('a preview checked on one grant is gone when the page moves to another', async () => {
    csrAPI.athletesBulk.mockResolvedValue(CLEAN);
    const { rerender } = await upload(SHEET);
    await screen.findByRole('dialog');

    mockId = '43';
    rerender(<CSRProjectDetailPage />);
    await waitFor(() => expect(csrAPI.projects.getById).toHaveBeenLastCalledWith('43'));
    await screen.findByRole('button', { name: 'Add Athlete' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(csrAPI.athletesBulk).toHaveBeenCalledTimes(1);
  });
});
