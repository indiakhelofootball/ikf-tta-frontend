// The grant form is a page now, not a dialog. These replace the four tests that
// lived on CSRProjectModal — the validation and payload assertions still matter
// and were the only coverage the save path had — plus the parts that only exist
// because it became a page: it loads its own record from the :id in the URL, it
// has to refuse to render a blank form when that load fails, and it leaves by
// navigating rather than by calling a prop.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRProjectFormPage from './CSRProjectFormPage';

const mockNavigate = jest.fn();
let mockParams = {};

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: {
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../utils/adminStorage', () => ({
  getProjectNames: () => [{ id: 7, name: 'Khelo Girls — Chhattisgarh' }],
}));

jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

const { csrAPI } = require('../../services/api');

const GRANT = {
  id: 11,
  name: 'Grassroots Football — Maharashtra',
  clientName: 'Tata Trusts',
  sanctionedAmount: '2500000.00',
  startDate: '2026-04-05',
  endDate: '2027-04-05',
  status: 'Active',
  description: 'Under-16 talent identification across six districts.',
  projectRefId: 7,
  season: 'Season 6',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe('creating a grant', () => {
  test('will not save without the three fields the record cannot exist without', async () => {
    render(<CSRProjectFormPage />);

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(csrAPI.projects.create).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/required|enter an amount/i)).not.toHaveLength(0);
  });

  test('sends the trimmed payload and leaves for the list', async () => {
    csrAPI.projects.create.mockResolvedValue({});
    render(<CSRProjectFormPage />);

    await userEvent.type(screen.getByLabelText(/project name/i), '  Khelo Girls  ');
    await userEvent.type(screen.getByLabelText(/client \/ funder/i), ' Tata Trusts ');
    await userEvent.type(screen.getByLabelText(/sanctioned amount/i), '1200000');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.projects.create).toHaveBeenCalled());
    const payload = csrAPI.projects.create.mock.calls[0][0];
    expect(payload.name).toBe('Khelo Girls');
    expect(payload.clientName).toBe('Tata Trusts');
    // Never asked for, always sent. A grant recorded before the field was
    // dropped must not be blanked by an unrelated edit.
    expect(payload).toHaveProperty('season');
    // The confirmation rides in navigation state: the page that reports the
    // save is not the page that performed it.
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/projects', { state: { saved: 'Project created.' } },
    );
  });
});

describe('editing a grant', () => {
  beforeEach(() => { mockParams = { id: '11' }; });

  test('loads the record named in the URL and fills the form from it', async () => {
    csrAPI.projects.getById.mockResolvedValue(GRANT);
    render(<CSRProjectFormPage />);

    await waitFor(() => expect(csrAPI.projects.getById).toHaveBeenCalledWith('11'));
    expect(await screen.findByDisplayValue('Grassroots Football — Maharashtra')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tata Trusts')).toBeInTheDocument();
  });

  test('carries season through an edit that never showed it', async () => {
    csrAPI.projects.getById.mockResolvedValue(GRANT);
    csrAPI.projects.update.mockResolvedValue({});
    render(<CSRProjectFormPage />);

    await screen.findByDisplayValue('Tata Trusts');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.projects.update).toHaveBeenCalled());
    const [id, payload] = csrAPI.projects.update.mock.calls[0];
    expect(id).toBe('11');
    expect(payload.season).toBe('Season 6');
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/projects', { state: { saved: 'Project updated.' } },
    );
    // The form has no season input at all — the value can only have survived by
    // being carried, which is the whole point.
    expect(screen.queryByLabelText(/season/i)).toBeNull();
  });

  test('a record that will not load stops, rather than offering an empty form', async () => {
    csrAPI.projects.getById.mockRejectedValue(new Error('404'));
    render(<CSRProjectFormPage />);

    await waitFor(() => expect(csrAPI.projects.getById).toHaveBeenCalled());
    // An empty form here would look like "new grant" and a save would silently
    // create a duplicate instead of editing the one that was asked for.
    expect(screen.queryByLabelText(/project name/i)).toBeNull();
    expect(csrAPI.projects.create).not.toHaveBeenCalled();
  });

  test('a failed save keeps the operator on the page with the reason', async () => {
    csrAPI.projects.getById.mockResolvedValue(GRANT);
    csrAPI.projects.update.mockRejectedValue(new Error('Sanctioned amount is not a number'));
    render(<CSRProjectFormPage />);

    await screen.findByDisplayValue('Tata Trusts');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not a number/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('the completion bar', () => {
  test('counts the required fields as they are filled, and only those', async () => {
    render(<CSRProjectFormPage />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(bar).toHaveAttribute('aria-valuenow', '0');

    await userEvent.type(screen.getByLabelText(/project name/i), 'Khelo Girls');
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1'));

    // Description is not tracked — it is not a field a funder queries a grant
    // over, and counting it would make the bar unreachable on a real record.
    await userEvent.type(screen.getByLabelText(/description/i), 'Six districts.');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  test('a non-numeric amount does not count as filled', async () => {
    render(<CSRProjectFormPage />);

    await userEvent.type(screen.getByLabelText(/sanctioned amount/i), 'abc');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

test('cancel leaves without writing anything', async () => {
  render(<CSRProjectFormPage />);

  await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

  expect(csrAPI.projects.create).not.toHaveBeenCalled();
  expect(csrAPI.projects.update).not.toHaveBeenCalled();
  // Leaving without saving must carry no message — and must not hand the click
  // event through as one, which is what a bare onClick={leave} would do.
  expect(mockNavigate).toHaveBeenCalledWith('/csr/projects', undefined);
});
