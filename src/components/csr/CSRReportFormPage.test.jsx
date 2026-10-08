// The report form is a page now, not a dialog. Coverage focuses on what only
// exists because it became a page: loading by :id, refusing a blank form on a
// failed load, the ?project= query param scoping both the orphan-record guard
// and the activity picker.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRReportFormPage from './CSRReportFormPage';

const mockNavigate = jest.fn();
let mockParams = {};
let mockSearch = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => [mockSearch],
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    reports: { getById: jest.fn(), create: jest.fn(), update: jest.fn() },
    activities: { getAll: jest.fn() },
    reportFile: { upload: jest.fn(), download: jest.fn(), remove: jest.fn() },
  },
}));

const { csrAPI } = require('../../services/api');

const REPORT = {
  id: 9, projectId: 11, projectName: 'Grassroots Football',
  title: 'Nashik Trial Summary', reportType: 'Trial',
  fileName: '', fileUrl: 'https://drive.example.com/x', activityId: '',
  visibleToClient: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = new URLSearchParams();
  csrAPI.activities.getAll.mockResolvedValue([{ id: 3, title: 'District Trial — Nashik' }]);
});

test('creating without ?project= stops rather than posting an orphan', async () => {
  render(<CSRReportFormPage />);
  expect(await screen.findByText(/no grant selected/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/report name/i)).toBeNull();
});

describe('creating a report', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('will not save without a name and a document link', async () => {
    render(<CSRReportFormPage />);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
  });

  test('sends the payload with the grant from the query param', async () => {
    csrAPI.reports.create.mockResolvedValue({});
    render(<CSRReportFormPage />);

    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 Utilisation Statement');
    await userEvent.selectOptions(screen.getByLabelText(/report type/i), 'Overall');
    await userEvent.type(screen.getByLabelText(/document link/i), 'https://drive.example.com/q2');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.create).toHaveBeenCalled());
    const payload = csrAPI.reports.create.mock.calls[0][0];
    expect(payload.title).toBe('Q2 Utilisation Statement');
    expect(payload.reportType).toBe('Overall');
    expect(payload.fileUrl).toBe('https://drive.example.com/q2');
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Report filed.' } },
    );
  });

  test('report type order matches the backend choices, Overall before Other', async () => {
    render(<CSRReportFormPage />);
    const options = within(screen.getByLabelText(/report type/i)).getAllByRole('option');
    expect(options.map((o) => o.textContent))
      .toEqual(['—', 'Trial', 'Workshop', 'Training Programme', 'Overall', 'Other']);
  });

  test('the activity picker is scoped to the grant from the query param', async () => {
    render(<CSRReportFormPage />);
    await waitFor(() => expect(csrAPI.activities.getAll).toHaveBeenCalledWith({ project: 11 }));
    expect(await screen.findByText('District Trial — Nashik')).toBeInTheDocument();
  });
});

describe('editing a report', () => {
  beforeEach(() => { mockParams = { id: '9' }; });

  test('loads the record named in the URL and fills the form from it', async () => {
    csrAPI.reports.getById.mockResolvedValue(REPORT);
    render(<CSRReportFormPage />);

    await waitFor(() => expect(csrAPI.reports.getById).toHaveBeenCalledWith('9'));
    expect(await screen.findByDisplayValue('Nashik Trial Summary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://drive.example.com/x')).toBeInTheDocument();
  });

  test('a record that will not load stops, rather than offering an empty form', async () => {
    csrAPI.reports.getById.mockRejectedValue(new Error('404'));
    render(<CSRReportFormPage />);

    expect(await screen.findByText(/report not found/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/report name/i)).toBeNull();
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
  });

  test('cancel leaves for the loaded grant without saving', async () => {
    csrAPI.reports.getById.mockResolvedValue(REPORT);
    render(<CSRReportFormPage />);
    await screen.findByDisplayValue('Nashik Trial Summary');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(csrAPI.reports.create).not.toHaveBeenCalled();
    expect(csrAPI.reports.update).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', undefined);
  });
});

test('the visibility control says the funder reads the title', async () => {
  mockSearch = new URLSearchParams({ project: '11' });
  render(<CSRReportFormPage />);
  const box = await screen.findByRole('checkbox', { name: /visible to client/i });
  expect(box).toHaveAccessibleDescription('The funder sees this title on their portal.');
  expect(screen.queryByText(/linked report/i)).toBeNull();
});

test('a report needs a title even when the document link is filled', async () => {
  mockSearch = new URLSearchParams({ project: '11' });
  render(<CSRReportFormPage />);
  await userEvent.type(screen.getByLabelText(/document link/i), 'https://drive.example.com/q2');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(screen.getByLabelText(/report name/i)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText(/report name/i)).toHaveAccessibleDescription('Required');
  expect(csrAPI.reports.create).not.toHaveBeenCalled();
});

describe('a document link or an uploaded file', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  const pdf = (size = 2048, name = 'summary.pdf') => {
    const f = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  test('with neither, the save is blocked and says what is missing', async () => {
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByLabelText(/document link/i))
      .toHaveAccessibleDescription('Upload the report, or paste a Drive link.');
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
    expect(csrAPI.reportFile.upload).not.toHaveBeenCalled();
  });

  test('a file alone is enough: the report is saved, then the file uploaded to it', async () => {
    const order = [];
    csrAPI.reports.create.mockImplementation(async () => { order.push('create'); return { id: 42 }; });
    csrAPI.reportFile.upload.mockImplementation(async () => { order.push('upload'); return {}; });
    render(<CSRReportFormPage />);

    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    const file = pdf();
    await userEvent.upload(screen.getByLabelText(/upload file/i), file);
    expect(screen.getByText(/summary\.pdf \(2 KB\) will be uploaded on save/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reportFile.upload).toHaveBeenCalledWith(42, file));
    expect(order).toEqual(['create', 'upload']);
    expect(csrAPI.reports.create.mock.calls[0][0].fileUrl).toBe('');
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { saved: 'Report filed.' } });
  });

  test('a link alone is enough and nothing is uploaded', async () => {
    csrAPI.reports.create.mockResolvedValue({ id: 5 });
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.type(screen.getByLabelText(/document link/i), 'https://drive.example.com/q2');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.create).toHaveBeenCalled());
    expect(csrAPI.reportFile.upload).not.toHaveBeenCalled();
  });

  test('a file over 15 MB is refused before anything is sent', async () => {
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.upload(screen.getByLabelText(/upload file/i), pdf(15 * 1024 * 1024 + 1));
    expect(screen.getByLabelText(/upload file/i))
      .toHaveAccessibleDescription('The file is larger than 15 MB.');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
  });

  test('a disallowed type is refused', async () => {
    render(<CSRReportFormPage />);
    const input = screen.getByLabelText(/upload file/i);
    // The accept attribute would filter this in a browser picker; a drop or a
    // changed filter must still be caught.
    input.removeAttribute('accept');
    await userEvent.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(input).toHaveAccessibleDescription(/upload a pdf, image/i);
  });

  test('a failed upload keeps the page and retries against the same report', async () => {
    csrAPI.reports.create.mockResolvedValue({ id: 42 });
    csrAPI.reportFile.upload.mockRejectedValueOnce(new Error('network down'));
    csrAPI.reportFile.upload.mockResolvedValueOnce({});
    csrAPI.reports.update.mockResolvedValue({});
    render(<CSRReportFormPage />);

    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.upload(screen.getByLabelText(/upload file/i), pdf());
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/saved, but the file was not/i);
    expect(mockNavigate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.reportFile.upload).toHaveBeenCalledTimes(2));
    expect(csrAPI.reports.create).toHaveBeenCalledTimes(1);
    expect(csrAPI.reports.update).toHaveBeenCalledWith(42, expect.any(Object));
  });
});

describe('editing a report that has an uploaded file', () => {
  beforeEach(() => { mockParams = { id: '9' }; });

  const WITH_FILE = {
    ...REPORT, fileUrl: '', hasFile: true,
    uploadedFileName: 'nashik.pdf', uploadedFileSize: 1536,
  };

  test('shows the current file, and saves without a link', async () => {
    csrAPI.reports.getById.mockResolvedValue(WITH_FILE);
    csrAPI.reports.update.mockResolvedValue({});
    render(<CSRReportFormPage />);

    expect(await screen.findByText(/current file: nashik\.pdf \(2 KB\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^download$/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.update).toHaveBeenCalled());
    expect(csrAPI.reportFile.remove).not.toHaveBeenCalled();
    expect(csrAPI.reportFile.upload).not.toHaveBeenCalled();
  });

  test('removing the only file without a link is blocked', async () => {
    csrAPI.reports.getById.mockResolvedValue(WITH_FILE);
    render(<CSRReportFormPage />);
    await screen.findByText(/current file/i);

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(csrAPI.reports.update).not.toHaveBeenCalled();
    expect(csrAPI.reportFile.remove).not.toHaveBeenCalled();
  });

  test('removing the file while keeping a link deletes it on save', async () => {
    csrAPI.reports.getById.mockResolvedValue({ ...WITH_FILE, fileUrl: 'https://drive.example.com/x' });
    csrAPI.reports.update.mockResolvedValue({});
    csrAPI.reportFile.remove.mockResolvedValue();
    render(<CSRReportFormPage />);
    await screen.findByText(/current file/i);

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reportFile.remove).toHaveBeenCalledWith('9'));
  });
});
