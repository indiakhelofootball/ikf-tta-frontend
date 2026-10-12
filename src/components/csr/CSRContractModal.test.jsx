// A grant contract refuses a negative amount, the same rule the server applies
// and the same rule a grant's sanctioned amount has (D-013). Zero still saves.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRContractModal from './CSRContractModal';

const renderModal = (onSave = jest.fn()) => {
  render(<CSRContractModal open contract={null} onClose={() => {}} onSave={onSave} saving={false} serverErrors={{}} />);
  fireEvent.change(screen.getByLabelText(/reference/i), { target: { value: 'WO-1' } });
  return onSave;
};

const setAmount = (value) => fireEvent.change(screen.getByLabelText(/contract amount/i), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

test('a negative amount is named and not saved', () => {
  const onSave = renderModal();
  setAmount('-100');
  save();
  expect(screen.getByText("The amount can't be negative.")).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

test('zero and a positive amount save as before', () => {
  const onSave = renderModal();
  setAmount('0');
  save();
  expect(onSave).toHaveBeenCalledTimes(1);
  setAmount('500000');
  save();
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(onSave.mock.calls[1][0].amount).toBe('500000');
});

test('a blank amount still asks for one', () => {
  const onSave = renderModal();
  save();
  expect(screen.getByText('Enter an amount')).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});
