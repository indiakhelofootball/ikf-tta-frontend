// The report form is a page now, not a dialog. Coverage focuses on what only
// exists because it became a page: loading by :id, refusing a blank form on a
// failed load, the ?project= query param scoping both the orphan-record guard
// and the activity picker. Plus the simplified shape: one Attach block (a file
// or a link), report types from the Admin catalogue, Activity under "More".
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
    reports: { getById: jest.fn(), create: jest.fn(), update: jest.fn(), saveWithFile: jest.fn() },
    activities: { getAll: jest.fn() },
    reportFile: { upload: jest.fn(), download: jest.fn(), remove: jest.fn() },
  },
}));

jest.mock('../../utils/adminStorage', () => ({
  getReportTypes: () => [
    { id: 1, name: 'Trial' },
    { id: 2, name: 'Workshop' },
    { id: 3, name: 'Overall' },
    { id: 4, name: 'Annual Impact Review' },
  ],
}));

jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

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
    await userEvent.type(screen.getByLabelText(/or paste a link/i), 'https://drive.example.com/q2');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.create).toHaveBeenCalled());
    const payload = csrAPI.reports.create.mock.calls[0][0];
    expect(payload.title).toBe('Q2 Utilisation Statement');
    expect(payload.reportType).toBe('Overall');
    expect(payload.fileUrl).toBe('https://drive.example.com/q2');
    expect(payload.fileName).toBe('');
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Report filed.', tab: 3 } },
    );
  });

  test('report types come from the Admin catalogue, not a list in the form', async () => {
    render(<CSRReportFormPage />);
    const select = screen.getByLabelText(/report type/i);
    const options = within(select).getAllByRole('option');
    expect(options.map((o) => o.textContent))
      .toEqual(['—', 'Trial', 'Workshop', 'Overall', 'Annual Impact Review']);
    expect(select).toHaveAccessibleDescription('Managed in Admin > Report Types.');
  });

  test('the fields run name, type, attach, date, show to funder, then activity under More', async () => {
    const { container } = render(<CSRReportFormPage />);
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const controls = Array.from(container.querySelectorAll('input, select'))
      .map((el) => el.id || el.type);
    expect(controls).toEqual(['r-title', 'r-type', 'r-file', 'r-url', 'r-docdate', 'checkbox', 'r-activity']);
    expect(screen.getByLabelText('Date shown to funder (optional)')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /attach/i }))
      .toHaveAccessibleDescription('A file or a link, either is enough');
    expect(screen.getByText('More').tagName).toBe('SUMMARY');
    expect(screen.queryByLabelText(/file name/i)).toBeNull();
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

  test('a type Admin has since retired stays selected on that report', async () => {
    csrAPI.reports.getById.mockResolvedValue({ ...REPORT, reportType: 'Training Programme' });
    render(<CSRReportFormPage />);
    await screen.findByDisplayValue('Nashik Trial Summary');
    expect(screen.getByLabelText(/report type/i)).toHaveValue('Training Programme');
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
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { tab: 3 } });
  });
});

test('the visibility control says the funder reads the title', async () => {
  mockSearch = new URLSearchParams({ project: '11' });
  render(<CSRReportFormPage />);
  const box = await screen.findByRole('checkbox', { name: /show to funder/i });
  expect(box).toHaveAccessibleDescription('The funder sees this title on their portal.');
  expect(screen.queryByText(/linked report/i)).toBeNull();
});

test('a report needs a title even when the document link is filled', async () => {
  mockSearch = new URLSearchParams({ project: '11' });
  render(<CSRReportFormPage />);
  await userEvent.type(screen.getByLabelText(/or paste a link/i), 'https://drive.example.com/q2');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(screen.getByLabelText(/report name/i)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText(/report name/i)).toHaveAccessibleDescription('Required');
  expect(csrAPI.reports.create).not.toHaveBeenCalled();
});

const pdf = (size = 2048, name = 'summary.pdf') => {
  const f = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('a document link or an uploaded file', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('with neither, the save is blocked and says what is missing', async () => {
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByLabelText(/or paste a link/i))
      .toHaveAccessibleDescription('Upload the report, or paste a Drive link.');
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
    expect(csrAPI.reports.saveWithFile).not.toHaveBeenCalled();
  });

  test('a file alone is enough: the report and its file go in one request', async () => {
    csrAPI.reports.saveWithFile.mockResolvedValue({ id: 42, hasFile: true });
    render(<CSRReportFormPage />);

    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    const file = pdf();
    await userEvent.upload(screen.getByLabelText(/upload a file/i), file);
    expect(screen.getByText(/summary\.pdf \(2 KB\) will be uploaded on save/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.saveWithFile).toHaveBeenCalledTimes(1));
    const [reportId, payload, parts] = csrAPI.reports.saveWithFile.mock.calls[0];
    expect(reportId).toBeNull();
    expect(parts).toEqual({ file });
    expect(payload.fileUrl).toBe('');
    expect(payload.fileName).toBe('summary.pdf');
    expect(payload.projectId).toBe(11);
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
    expect(csrAPI.reportFile.upload).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { saved: 'Report filed.', tab: 3 } });
  });

  test('a link alone is enough and nothing is uploaded', async () => {
    csrAPI.reports.create.mockResolvedValue({ id: 5 });
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.type(screen.getByLabelText(/or paste a link/i), 'https://drive.example.com/q2');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.create).toHaveBeenCalled());
    expect(csrAPI.reports.saveWithFile).not.toHaveBeenCalled();
  });

  test('a file over 15 MB is refused before anything is sent', async () => {
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.upload(screen.getByLabelText(/upload a file/i), pdf(15 * 1024 * 1024 + 1));
    expect(screen.getByLabelText(/upload a file/i))
      .toHaveAccessibleDescription('The file is larger than 15 MB.');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
  });

  test('a disallowed type is refused', async () => {
    render(<CSRReportFormPage />);
    const input = screen.getByLabelText(/upload a file/i);
    // The accept attribute would filter this in a browser picker; a drop or a
    // changed filter must still be caught.
    input.removeAttribute('accept');
    await userEvent.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(input).toHaveAccessibleDescription(/upload a pdf, image/i);
  });

  test('a timeout is not reported as nothing saved, since it proves nothing', async () => {
    csrAPI.reports.saveWithFile.mockRejectedValue(
      new Error('The server took too long to respond. Please try again.'),
    );
    render(<CSRReportFormPage />);
    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.upload(screen.getByLabelText(/upload a file/i), pdf());
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert'))
      .toHaveTextContent(/^The server took too long to respond. Please try again.$/);
  });

  test('a refused file saves nothing, keeps the page, and Save sends the whole report again', async () => {
    const refused = new Error('The file does not match its .pdf extension.');
    refused.response = { status: 400, data: { file: [refused.message] } };
    csrAPI.reports.saveWithFile.mockRejectedValueOnce(refused);
    csrAPI.reports.saveWithFile.mockResolvedValueOnce({ id: 42 });
    render(<CSRReportFormPage />);

    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 statement');
    await userEvent.upload(screen.getByLabelText(/upload a file/i), pdf());
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Nothing was saved. The file does not match its .pdf extension.');
    expect(mockNavigate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.reports.saveWithFile).toHaveBeenCalledTimes(2));
    expect(csrAPI.reports.saveWithFile.mock.calls[1][0]).toBeNull();
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
    expect(csrAPI.reports.update).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { saved: 'Report filed.', tab: 3 } });
  });
});

describe('editing a report that has an uploaded file', () => {
  beforeEach(() => { mockParams = { id: '9' }; });

  const WITH_FILE = {
    ...REPORT, fileUrl: '', hasFile: true,
    uploadedFileName: 'nashik.pdf', uploadedFileSize: 1536,
  };

  test('shows the file with Download, Replace and Remove, and saves without a link', async () => {
    csrAPI.reports.getById.mockResolvedValue(WITH_FILE);
    csrAPI.reports.update.mockResolvedValue({});
    render(<CSRReportFormPage />);

    expect(await screen.findByText('nashik.pdf (2 KB)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^download$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^replace$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/upload a file/i)).toBeNull();
    expect(screen.queryByLabelText(/link/i)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.update).toHaveBeenCalled());
    expect(csrAPI.reports.saveWithFile).not.toHaveBeenCalled();
  });

  test('a file that also has a link keeps the link editable', async () => {
    csrAPI.reports.getById.mockResolvedValue({ ...WITH_FILE, fileUrl: 'https://drive.example.com/x' });
    render(<CSRReportFormPage />);
    await screen.findByText('nashik.pdf (2 KB)');
    expect(screen.getByLabelText('Link')).toHaveValue('https://drive.example.com/x');
  });

  test('Replace takes a new file and sends it with the report on save', async () => {
    csrAPI.reports.getById.mockResolvedValue(WITH_FILE);
    csrAPI.reports.saveWithFile.mockResolvedValue({});
    render(<CSRReportFormPage />);
    await screen.findByText('nashik.pdf (2 KB)');

    await userEvent.click(screen.getByRole('button', { name: /^replace$/i }));
    const file = pdf(2048, 'nashik-v2.pdf');
    await userEvent.upload(screen.getByLabelText(/upload a file/i), file);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.saveWithFile)
      .toHaveBeenCalledWith('9', expect.any(Object), { file }));
    expect(csrAPI.reports.saveWithFile.mock.calls[0][1].fileName).toBe('nashik-v2.pdf');
    expect(csrAPI.reports.update).not.toHaveBeenCalled();
  });

  test('removing the only file without a link is blocked', async () => {
    csrAPI.reports.getById.mockResolvedValue(WITH_FILE);
    render(<CSRReportFormPage />);
    await screen.findByText('nashik.pdf (2 KB)');

    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(screen.getByText('nashik.pdf will be removed on save.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(csrAPI.reports.update).not.toHaveBeenCalled();
    expect(csrAPI.reports.saveWithFile).not.toHaveBeenCalled();
  });

  test('removing the file while keeping a link deletes it in the same request as the save', async () => {
    csrAPI.reports.getById.mockResolvedValue({ ...WITH_FILE, fileUrl: 'https://drive.example.com/x' });
    csrAPI.reports.saveWithFile.mockResolvedValue({});
    render(<CSRReportFormPage />);
    await screen.findByText('nashik.pdf (2 KB)');

    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.saveWithFile)
      .toHaveBeenCalledWith('9', expect.any(Object), { removeFile: 'true' }));
    expect(csrAPI.reports.update).not.toHaveBeenCalled();
    expect(csrAPI.reportFile.remove).not.toHaveBeenCalled();
  });

  test('Keep current file undoes a Remove', async () => {
    csrAPI.reports.getById.mockResolvedValue(WITH_FILE);
    csrAPI.reports.update.mockResolvedValue({});
    render(<CSRReportFormPage />);
    await screen.findByText('nashik.pdf (2 KB)');

    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    await userEvent.click(screen.getByRole('button', { name: /keep current file/i }));
    expect(screen.getByText('nashik.pdf (2 KB)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.update).toHaveBeenCalled());
    expect(csrAPI.reports.saveWithFile).not.toHaveBeenCalled();
  });
});

// Owner decision D-016: a new report is visible to the funder unless staff
// switch it off; an existing report keeps whatever was stored.
test('a new report starts visible to the client, and is sent that way', async () => {
  mockSearch = new URLSearchParams({ project: '11' });
  csrAPI.reports.create.mockResolvedValue({});
  render(<CSRReportFormPage />);
  expect(await screen.findByRole('checkbox', { name: /show to funder/i })).toBeChecked();

  await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 Utilisation Statement');
  await userEvent.type(screen.getByLabelText(/or paste a link/i), 'https://drive.example.com/q2');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(csrAPI.reports.create).toHaveBeenCalled());
  expect(csrAPI.reports.create.mock.calls[0][0].visibleToClient).toBe(true);
});

test.each([false, true])('editing keeps the stored visibility (%p)', async (stored) => {
  mockParams = { id: '9' };
  csrAPI.reports.getById.mockResolvedValue({ ...REPORT, visibleToClient: stored });
  render(<CSRReportFormPage />);
  await screen.findByDisplayValue('Nashik Trial Summary');
  expect(screen.getByRole('checkbox', { name: /show to funder/i }).checked).toBe(stored);
});

describe('D-018: the line beside Save follows the switch', () => {
  const line = () => screen.getByRole('button', { name: /save/i }).parentElement;

  test('a new report: shown, then hidden once switched off', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    render(<CSRReportFormPage />);
    expect(line()).toHaveTextContent('Visible to funder');
    await userEvent.click(screen.getByRole('checkbox', { name: /show to funder/i }));
    expect(line()).toHaveTextContent('Not visible to funder');
    expect(line()).not.toHaveTextContent('Visible to funder');
  });

  test('an edit of a hidden report says hidden', async () => {
    mockParams = { id: '9' };
    csrAPI.reports.getById.mockResolvedValue(REPORT);
    render(<CSRReportFormPage />);
    await screen.findByDisplayValue('Nashik Trial Summary');
    expect(line()).toHaveTextContent('Not visible to funder');
  });
});
