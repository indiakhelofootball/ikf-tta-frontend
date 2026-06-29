import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRActivityModal from './CSRActivityModal';

describe('CSRActivityModal', () => {
  const types = [{ id: 1, name: 'Boys Trial' }];

  test('does not save without a title and type', () => {
    const onSave = jest.fn();
    render(
      <CSRActivityModal
        open activity={null} activityTypes={types}
        onClose={() => {}} onSave={onSave} saving={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('disables Save when no activity types exist (catalog empty)', () => {
    render(
      <CSRActivityModal
        open activity={null} activityTypes={[]}
        onClose={() => {}} onSave={() => {}} saving={false}
      />
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(screen.getByText(/add them in the catalog first/i)).toBeInTheDocument();
  });
});
