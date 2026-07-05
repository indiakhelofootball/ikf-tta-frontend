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
        fileName: 'Q1 Report',
        fileUrl: 'https://drive/x',
        visibleToClient: false,
        activityId: null,
      })
    );
  });
});
