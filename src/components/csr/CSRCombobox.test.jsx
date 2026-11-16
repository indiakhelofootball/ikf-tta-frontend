import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CSRCombobox from './CSRCombobox';

const OPTIONS = [
  { id: 1, label: 'A1 Classes', hint: 'Coaching' },
  { id: 2, label: 'Kick Academy' },
  { id: 3, label: 'Goal Trust' },
];

function Harness({ initial = '', onPicked = () => {}, ...props }) {
  const [value, setValue] = useState(initial);
  const [options, setOptions] = useState(OPTIONS);
  return (
    <div>
      <label htmlFor="cb">Partner</label>
      <CSRCombobox
        id="cb"
        value={value}
        options={options}
        onChange={(v) => { setValue(v); onPicked(v); }}
        placeholder="Search partners"
        emptyText="No partner matches."
        aria-describedby="cb-help"
        {...props}
        allowAdd={props.allowAdd && {
          ...props.allowAdd,
          onAdd: async (text) => {
            const newId = await props.allowAdd.onAdd(text);
            setOptions((o) => [...o, { id: newId, label: text }]);
            return newId;
          },
        }}
      />
      <p id="cb-help">Help</p>
    </div>
  );
}

const input = () => screen.getByRole('combobox', { name: 'Partner' });
const listed = () => within(screen.getByRole('listbox')).queryAllByRole('option').map((o) => o.textContent);

test('typing filters the list, matching label and hint', async () => {
  render(<Harness />);
  await userEvent.type(input(), 'coach');
  expect(input()).toHaveAttribute('aria-expanded', 'true');
  expect(listed()).toEqual(['A1 ClassesCoaching']);

  await userEvent.clear(input());
  await userEvent.type(input(), 'a');
  expect(listed()).toEqual(['A1 ClassesCoaching', 'Kick Academy', 'Goal Trust']);
});

test('click picks an option and the input shows its label', async () => {
  const onPicked = jest.fn();
  render(<Harness onPicked={onPicked} />);
  await userEvent.click(input());
  await userEvent.click(screen.getByRole('option', { name: 'Kick Academy' }));
  expect(onPicked).toHaveBeenCalledWith(2);
  expect(input()).toHaveValue('Kick Academy');
  expect(input()).toHaveAttribute('aria-expanded', 'false');
});

test('arrow keys, Home, End and Enter pick from the keyboard', async () => {
  const onPicked = jest.fn();
  render(<Harness onPicked={onPicked} />);
  input().focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(input()).toHaveAttribute('aria-activedescendant', 'cb-opt-0');
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
  expect(input()).toHaveAttribute('aria-activedescendant', 'cb-opt-2');
  await userEvent.keyboard('{Home}');
  expect(input()).toHaveAttribute('aria-activedescendant', 'cb-opt-0');
  await userEvent.keyboard('{End}{ArrowUp}{Enter}');
  expect(onPicked).toHaveBeenLastCalledWith(2);
  expect(input()).toHaveValue('Kick Academy');
});

test('Escape closes the list and puts the picked label back', async () => {
  render(<Harness initial={3} />);
  expect(input()).toHaveValue('Goal Trust');
  await userEvent.type(input(), 'xyz');
  await userEvent.keyboard('{Escape}');
  expect(input()).toHaveAttribute('aria-expanded', 'false');
  expect(input()).toHaveValue('Goal Trust');
});

test('nothing matching shows the empty text and no add row without allowAdd', async () => {
  render(<Harness />);
  await userEvent.type(input(), 'zzz');
  expect(screen.getByText('No partner matches.')).toBeInTheDocument();
  expect(listed()).toEqual([]);
});

test('the add row creates the typed name and picks it', async () => {
  const onAdd = jest.fn().mockResolvedValue(9);
  const onPicked = jest.fn();
  render(<Harness onPicked={onPicked} allowAdd={{ label: (t) => `Add "${t}"`, onAdd }} />);
  await userEvent.type(input(), 'Star Club');
  expect(screen.getByText('No partner matches.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('option', { name: 'Add "Star Club"' }));
  expect(onAdd).toHaveBeenCalledWith('Star Club');
  await waitFor(() => expect(onPicked).toHaveBeenCalledWith(9));
  expect(input()).toHaveValue('Star Club');
});

test('the add row is reachable from the keyboard, and a failed add says why', async () => {
  const onAdd = jest.fn().mockRejectedValue(new Error('That name is already taken.'));
  render(<Harness allowAdd={{ label: (t) => `Add "${t}"`, onAdd }} />);
  await userEvent.type(input(), 'Star Club');
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(onAdd).toHaveBeenCalledWith('Star Club');
  expect(await screen.findByRole('alert')).toHaveTextContent('That name is already taken.');
  expect(input().getAttribute('aria-describedby')).toBe('cb-help cb-err');
});

test('clear empties the pick; aria passthrough and disabled hold', async () => {
  const onPicked = jest.fn();
  const { rerender } = render(<Harness initial={1} onPicked={onPicked} aria-invalid />);
  expect(input()).toHaveAttribute('aria-invalid', 'true');
  expect(input()).toHaveAccessibleDescription('Help');
  await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(onPicked).toHaveBeenCalledWith('');
  expect(input()).toHaveValue('');
  expect(input()).toHaveAttribute('placeholder', 'Search partners');

  rerender(<Harness disabled />);
  expect(input()).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
});
