// The expense-tag form is a page now, not a dialog. It is create-only — no
// :id route exists because the server keeps a tag audit-bound and write-once,
// which the modal it replaces already respected (it never loaded an existing
// tag either). Coverage focuses on the ?project= guard, validation, and the
// one fact that must never regress: paymentId is always null from this
// surface, because linking a real payment is a finance action done elsewhere.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRExpenseTagFormPage from './CSRExpenseTagFormPage';

const mockNavigate = jest.fn();
let mockSearch = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearch],
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    expenseTags: { create: jest.fn() },
    // The page reads the grant's own period so it can warn, before the save,
    // that a date falls outside it.
    projects: { getById: jest.fn() },
  },
}));

const { csrAPI } = require('../../services/api');

const GRANT = { id: 11, name: 'Grassroots Football', startDate: '2025-04-01', endDate: '2026-03-31' };

/** Today as the date input renders it, so a test never depends on the clock. */
const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = new URLSearchParams();
  csrAPI.projects.getById.mockResolvedValue(GRANT);
});

test('without ?project= it stops rather than posting an orphan tag', async () => {
  render(<CSRExpenseTagFormPage />);
  expect(await screen.findByText(/no grant selected/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/amount/i)).toBeNull();
});

describe('with a grant in the query param', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('will not save without an amount', async () => {
    render(<CSRExpenseTagFormPage />);
    await userEvent.click(screen.getByRole('button', { name: /tag/i }));
    expect(csrAPI.expenseTags.create).not.toHaveBeenCalled();
  });

  test('a non-numeric amount is rejected the same as a blank one', async () => {
    render(<CSRExpenseTagFormPage />);
    await userEvent.type(screen.getByLabelText(/amount/i), 'abc');
    await userEvent.click(screen.getByRole('button', { name: /tag/i }));
    expect(csrAPI.expenseTags.create).not.toHaveBeenCalled();
    expect(await screen.findByText(/enter an amount/i)).toBeInTheDocument();
  });

  test('paymentId is always null, never taken from anywhere on this page', async () => {
    csrAPI.expenseTags.create.mockResolvedValue({});
    render(<CSRExpenseTagFormPage />);

    await userEvent.type(screen.getByLabelText(/amount/i), '180000');
    await userEvent.type(screen.getByLabelText(/note/i), 'Pending clearance');
    await userEvent.click(screen.getByRole('button', { name: /tag/i }));

    await waitFor(() => expect(csrAPI.expenseTags.create).toHaveBeenCalled());
    const payload = csrAPI.expenseTags.create.mock.calls[0][0];
    expect(payload.paymentId).toBeNull();
    expect(payload.manualAmount).toBe('180000');
    expect(payload.note).toBe('Pending clearance');
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Expense tagged.' } },
    );
  });

  test('the expense date defaults to today and is sent with the tag', async () => {
    csrAPI.expenseTags.create.mockResolvedValue({});
    render(<CSRExpenseTagFormPage />);
    await waitFor(() => expect(csrAPI.projects.getById).toHaveBeenCalledWith(11));

    expect(screen.getByLabelText(/expense date/i)).toHaveValue(today());
    await userEvent.type(screen.getByLabelText(/amount/i), '5000');
    await userEvent.click(screen.getByRole('button', { name: /^tag$/i }));

    await waitFor(() => expect(csrAPI.expenseTags.create).toHaveBeenCalled());
    expect(csrAPI.expenseTags.create.mock.calls[0][0].expenseDate).toBe(today());
  });

  test('a date the operator sets is what gets sent, not the day they typed it', async () => {
    csrAPI.expenseTags.create.mockResolvedValue({});
    render(<CSRExpenseTagFormPage />);
    await waitFor(() => expect(csrAPI.projects.getById).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/amount/i), '5000');
    await userEvent.clear(screen.getByLabelText(/expense date/i));
    await userEvent.type(screen.getByLabelText(/expense date/i), '2025-09-10');
    await userEvent.click(screen.getByRole('button', { name: /^tag$/i }));

    await waitFor(() => expect(csrAPI.expenseTags.create).toHaveBeenCalled());
    expect(csrAPI.expenseTags.create.mock.calls[0][0].expenseDate).toBe('2025-09-10');
  });

  test('a date outside the grant period warns before the save, and still saves', async () => {
    // The complaint this page is answering: an expense that never reaches the
    // certificate. It is a real expense, so it is recorded either way — the
    // operator just finds out here instead of from a document months later.
    csrAPI.expenseTags.create.mockResolvedValue({});
    render(<CSRExpenseTagFormPage />);
    await waitFor(() => expect(csrAPI.projects.getById).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/amount/i), '5000');
    await userEvent.clear(screen.getByLabelText(/expense date/i));
    await userEvent.type(screen.getByLabelText(/expense date/i), '2024-01-01');

    expect(await screen.findByText(/outside the grant period/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^tag$/i }));
    await waitFor(() => expect(csrAPI.expenseTags.create).toHaveBeenCalled());
  });

  test('a grant whose period will not load does not block tagging', async () => {
    csrAPI.projects.getById.mockRejectedValue(new Error('403'));
    csrAPI.expenseTags.create.mockResolvedValue({});
    render(<CSRExpenseTagFormPage />);

    await userEvent.type(screen.getByLabelText(/amount/i), '5000');
    await userEvent.click(screen.getByRole('button', { name: /^tag$/i }));
    await waitFor(() => expect(csrAPI.expenseTags.create).toHaveBeenCalled());
    expect(screen.queryByText(/outside the grant period/i)).toBeNull();
  });

  test('cancel leaves for the grant without saving', async () => {
    render(<CSRExpenseTagFormPage />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(csrAPI.expenseTags.create).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', undefined);
  });
});
