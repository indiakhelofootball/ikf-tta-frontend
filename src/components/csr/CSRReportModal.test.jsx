import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRReportModal from './CSRReportModal';

describe('CSRReportModal', () => {
  test('requires a name and a document link', () => {
    const onSave = jest.fn();
    render(<CSRReportModal open report={null} activities={[]} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('submits the link-pattern fields', () => {
    const onSave = jest.fn();
    render(<CSRReportModal open report={null} activities={[]} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.change(screen.getByLabelText(/Report Name/i), { target: { value: 'Q1 Report' } });
    fireEvent.change(screen.getByLabelText(/Document Link/i), { target: { value: 'https://drive/x' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Q1 Report',
        fileUrl: 'https://drive/x',
        visibleToClient: false,
        activityId: null,
      })
    );
  });

  test('carries the report type when one is chosen', () => {
    const onSave = jest.fn();
    render(<CSRReportModal open report={null} activities={[]} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.change(screen.getByLabelText(/Report Name/i), { target: { value: 'Trial day 1' } });
    fireEvent.change(screen.getByLabelText(/Document Link/i), { target: { value: 'https://drive/x' } });
    fireEvent.mouseDown(screen.getByLabelText(/Report Type/i));
    fireEvent.click(screen.getByRole('option', { name: 'Workshop' }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Trial day 1', reportType: 'Workshop' })
    );
  });

  // A report saved before `title` existed put its name in fileName -- the field
  // was literally labelled "Report Name". Editing one must not show an empty
  // required field.
  test('falls back to fileName for reports saved before title existed', () => {
    const legacy = { id: 1, fileName: 'Old Q1 Report', fileUrl: 'https://drive/x', activityId: null };
    render(<CSRReportModal open report={legacy} activities={[]} onClose={() => {}} onSave={() => {}} saving={false} />);
    expect(screen.getByLabelText(/Report Name/i)).toHaveValue('Old Q1 Report');
  });
});
