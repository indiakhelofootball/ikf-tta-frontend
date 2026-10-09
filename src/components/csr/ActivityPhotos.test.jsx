import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { csrAPI } from '../../services/api';
import ActivityPhotos from './ActivityPhotos';

jest.mock('../../services/api', () => ({
  csrAPI: { activityPhotos: { list: jest.fn(), upload: jest.fn(), remove: jest.fn(), file: jest.fn() } },
}));

const jpg = (name = 'trial.jpg', size = 10) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' });

beforeEach(() => {
  URL.createObjectURL = jest.fn(() => 'blob:thumb');
  URL.revokeObjectURL = jest.fn();
  csrAPI.activityPhotos.list.mockResolvedValue([]);
  csrAPI.activityPhotos.file.mockResolvedValue({ blob: new Blob(['x']) });
});

test('photos upload straight away and appear as thumbnails', async () => {
  csrAPI.activityPhotos.upload.mockResolvedValue([{ id: 3, name: 'trial.jpg', size: 10, version: 'v' }]);
  render(<ActivityPhotos activityId="5" />);
  await userEvent.upload(screen.getByLabelText('Add activity photos'), jpg());
  await waitFor(() => expect(csrAPI.activityPhotos.upload).toHaveBeenCalledWith('5', expect.any(File)));
  expect(await screen.findByRole('img', { name: 'trial.jpg' })).toHaveAttribute('src', 'blob:thumb');
  expect(screen.getByText(/1 of 8/)).toBeInTheDocument();
});

test('an SVG or an oversized photo is refused before anything is sent', async () => {
  render(<ActivityPhotos activityId="5" />);
  await userEvent.upload(screen.getByLabelText('Add activity photos'), new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), { applyAccept: false });
  expect(await screen.findByRole('alert')).toHaveTextContent('upload a PNG, JPG or WEBP photo');
  await userEvent.upload(screen.getByLabelText('Add activity photos'), jpg('big.jpg', 4 * 1024 * 1024 + 1));
  expect(await screen.findByRole('alert')).toHaveTextContent('big.jpg is larger than 4 MB');
  expect(csrAPI.activityPhotos.upload).not.toHaveBeenCalled();
});

test('more than eight photos are refused, and a photo can be removed', async () => {
  const eight = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `p${i}.jpg`, size: 10, version: 'v' }));
  csrAPI.activityPhotos.list.mockResolvedValue(eight);
  render(<ActivityPhotos activityId="5" />);
  expect(await screen.findByText(/8 of 8/)).toBeInTheDocument();
  expect(screen.getByLabelText('Add activity photos')).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Remove p0.jpg' }));
  await waitFor(() => expect(csrAPI.activityPhotos.remove).toHaveBeenCalledWith('5', 1));
  expect(await screen.findByText(/7 of 8/)).toBeInTheDocument();
});
