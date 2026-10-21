// Raise Payment on a work order opens this form with the vendor and work order
// prefilled. The Payments page loads its vendor list at the same time, and the
// prefill effect reruns when that list arrives. Reported 2026-10-21: when the
// list arrived while the work-order lookup was still in flight, the form never
// showed the details until it was closed and reopened.

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

import { workOrdersAPI } from '../../services/api';
import PaymentRequestModal from './PaymentRequestModal';

jest.mock('../../services/api', () => ({
  workOrdersAPI: { getAll: jest.fn() },
  paymentRequestsAPI: { create: jest.fn() },
}));

jest.setTimeout(30000);

const VENDOR = { id: 7, vendorName: 'Vidarbha Sports', vendorType: 'Scout', companyType: 'Individual' };

const PERIODIC_WO = {
  id: 31,
  vendorId: 7,
  workOrderNumber: 'WO-VI-SP-003',
  type: 'Periodic',
  projectRef: 'IKF SEASON 6 TRIALS',
  amount: 44000,
  numberOfPeriods: 2,
  amountPerPeriod: 22000,
  paidPeriods: [],
  tdsRate: 0,
};

const FIXED_WO = {
  id: 32,
  vendorId: 7,
  workOrderNumber: 'WO-VI-FX-001',
  type: 'Fixed',
  projectRef: 'IKF SEASON 6 TRIALS',
  amount: 5000,
  paidGrossAmount: 0,
  tdsRate: 0,
};

const prefillFor = (wo) => ({ workOrder: wo, vendor: VENDOR, vendorId: 7 });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function renderModal(props) {
  const base = { open: true, onClose: jest.fn(), onSave: jest.fn(), onNavigateToWO: jest.fn() };
  const utils = render(<PaymentRequestModal {...base} {...props} />);
  return { ...utils, rerenderWith: (next) => utils.rerender(<PaymentRequestModal {...base} {...next} />) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('vendor list arriving while the work-order lookup is in flight still shows the details', async () => {
  const lookup = deferred();
  workOrdersAPI.getAll.mockReturnValueOnce(lookup.promise).mockResolvedValue({ workOrders: [PERIODIC_WO] });
  const prefillContext = prefillFor(PERIODIC_WO);

  const { rerenderWith } = renderModal({ allVendors: [], prefillContext });
  rerenderWith({ allVendors: [VENDOR], prefillContext });
  await act(async () => { lookup.resolve({ workOrders: [PERIODIC_WO] }); });

  expect(await screen.findByText('WO-VI-SP-003 — Periodic')).toBeInTheDocument();
  expect(screen.getByText('Select Period')).toBeInTheDocument();
});

test('vendor list already loaded: details show from one lookup, as before', async () => {
  workOrdersAPI.getAll.mockResolvedValue({ workOrders: [FIXED_WO] });

  renderModal({ allVendors: [VENDOR], prefillContext: prefillFor(FIXED_WO) });

  expect(await screen.findByText('WO-VI-FX-001 — Fixed')).toBeInTheDocument();
  expect(screen.getByLabelText(/Gross Amount/)).toHaveValue(5000);
  expect(workOrdersAPI.getAll).toHaveBeenCalledTimes(1);
});

test('vendor list changing after the details show keeps the chosen period and amount', async () => {
  workOrdersAPI.getAll.mockResolvedValue({ workOrders: [PERIODIC_WO] });
  const prefillContext = prefillFor(PERIODIC_WO);

  const { rerenderWith } = renderModal({ allVendors: [VENDOR], prefillContext });
  await screen.findByText('Select Period');
  fireEvent.click(screen.getByText('Period 1'));
  expect(screen.getByLabelText(/Gross Amount/)).toHaveValue(22000);

  rerenderWith({ allVendors: [{ ...VENDOR }], prefillContext });

  await waitFor(() => expect(screen.getByLabelText(/Gross Amount/)).toHaveValue(22000));
  expect(screen.getByText(/Amount auto-filled/)).toBeInTheDocument();
  expect(workOrdersAPI.getAll).toHaveBeenCalledTimes(1);
});

test('work-order lookup failing still falls back to the work order from the card', async () => {
  workOrdersAPI.getAll.mockRejectedValue(new Error('network'));

  renderModal({ allVendors: [VENDOR], prefillContext: prefillFor(FIXED_WO) });

  expect(await screen.findByText('WO-VI-FX-001 — Fixed')).toBeInTheDocument();
  expect(screen.getByLabelText(/Gross Amount/)).toHaveValue(5000);
});
