// Does the closed city field show the LABEL or the raw assignment id?
//
// The picker is a MUI `TextField select` whose option values are assignment
// ids. MUI draws the chosen MenuItem's children inside the closed input, so the
// two-line option needs `slotProps.select.renderValue` to collapse back to one
// line. If that slot were not forwarded in MUI v7, the field would fall back to
// something else — possibly the raw id — and the operator would see a number.
// This renders the real component rather than reasoning about the API.
import React from 'react';
import { render, screen } from '@testing-library/react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { assignmentOptionLines, assignmentSelectedLabel } from './courierAssignmentLabel';

const ASSIGNMENTS = [
  { id: 101, city: 'Belagavi', state: 'Karnataka', trialName: 'IKF-S6-004', trialType: 'IKF Namma Karnataka Trials' },
  { id: 118, city: 'Rajahmundry', state: 'Andhra Pradesh', trialName: 'IKF-S6-008', trialType: 'IKF Scout on Wheel Naari Shakti' },
];

function Picker({ value }) {
  return (
    <TextField
      select
      fullWidth
      size="small"
      value={value}
      onChange={() => {}}
      slotProps={{
        select: {
          renderValue: (v) => {
            const a = ASSIGNMENTS.find((x) => x.id === v);
            return a ? assignmentSelectedLabel(a) : '— Select city —';
          },
        },
      }}
    >
      <MenuItem value="" disabled>— Select city —</MenuItem>
      {ASSIGNMENTS.map((a) => (
        <MenuItem key={a.id} value={a.id} sx={{ display: 'block' }}>
          <Typography>{assignmentOptionLines(a).primary}</Typography>
          <Typography>{assignmentOptionLines(a).secondary}</Typography>
        </MenuItem>
      ))}
    </TextField>
  );
}

describe('the closed city field', () => {
  test('shows the city and the project code, never the raw id', () => {
    render(<Picker value={101} />);
    expect(screen.getByText('Belagavi, Karnataka · IKF-S6-004')).toBeInTheDocument();
    expect(screen.queryByText('101')).not.toBeInTheDocument();
  });

  // MUI does not call renderValue for an empty value unless displayEmpty is
  // set, so the closed field is blank until something is chosen. That is the
  // behaviour this field has always had — the placeholder lives on the first
  // MenuItem, inside the open menu. Pinned so nobody "fixes" it into showing
  // a stray value.
  test('an unselected field is blank, and never shows a stray id', () => {
    const { container } = render(<Picker value="" />);
    expect(container.querySelector('input')).toHaveValue('');
    expect(screen.queryByText('101')).not.toBeInTheDocument();
    expect(screen.queryByText('118')).not.toBeInTheDocument();
  });

  test('the id still reaches the form, so the write path is unchanged', () => {
    const { container } = render(<Picker value={118} />);
    expect(container.querySelector('input')).toHaveValue('118');
    expect(screen.getByText('Rajahmundry, Andhra Pradesh · IKF-S6-008')).toBeInTheDocument();
  });
});
