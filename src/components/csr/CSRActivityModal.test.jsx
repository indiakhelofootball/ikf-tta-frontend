import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRActivityModal from './CSRActivityModal';

jest.mock('../../services/api', () => ({
  trialsAPI: { getAll: jest.fn(() => Promise.resolve([])) },
  vendorsAPI: { getAll: jest.fn(() => Promise.resolve([])) },
}));

jest.mock('../../utils/adminStorage', () => ({
  getWorkshopNames: jest.fn(() => []),
  getTrainingProgrammes: jest.fn(() => []),
  subscribeConfig: jest.fn(() => () => {}),
  getConfigVersion: jest.fn(() => 0),
}));

const { trialsAPI, vendorsAPI } = require('../../services/api');
const adminStorage = require('../../utils/adminStorage');

describe('CSRActivityModal', () => {
  const types = [{ id: 1, name: 'Boys Trial' }];

  // CRA's jest config sets resetMocks: true, which strips a jest.mock factory's
  // implementation before every test. Defaults belong here, not in the factory.
  beforeEach(() => {
    trialsAPI.getAll.mockResolvedValue([]);
    vendorsAPI.getAll.mockResolvedValue([]);
    adminStorage.getWorkshopNames.mockReturnValue([]);
    adminStorage.getTrainingProgrammes.mockReturnValue([]);
    adminStorage.subscribeConfig.mockReturnValue(() => {});
    adminStorage.getConfigVersion.mockReturnValue(0);
  });

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

  describe('the workshop, programme and partner links', () => {
    // The agreed spec gives each activity type something to point at. Before
    // this, only the trial link existed: an operator could say "Workshop" but
    // not which workshop, or who ran it.
    beforeEach(() => {
      adminStorage.getWorkshopNames.mockReturnValue([
        { id: 11, name: 'Financial Literacy' },
      ]);
      adminStorage.getTrainingProgrammes.mockReturnValue([
        { id: 22, name: 'Grassroots Coaching L1' },
      ]);
      vendorsAPI.getAll.mockResolvedValue([
        { id: 31, vendorName: 'Partner Co', partnerCategory: 'Financial' },
        { id: 32, vendorName: 'Ordinary Supplier', partnerCategory: '' },
      ]);
    });


    const renderModal = (props = {}) => render(
      <CSRActivityModal
        open activity={null} activityTypes={types}
        onClose={() => {}} onSave={() => {}} saving={false}
        {...props}
      />
    );

    test('offers only vendors that carry a partner category', async () => {
      renderModal();
      const picker = screen.getByLabelText(/workshop partner/i);
      fireEvent.mouseDown(picker);
      fireEvent.change(picker, { target: { value: '' } });
      expect(await screen.findByText(/Partner Co/)).toBeInTheDocument();
      expect(screen.queryByText(/Ordinary Supplier/)).not.toBeInTheDocument();
    });

    test('an empty catalog says where the entries are maintained', () => {
      adminStorage.getWorkshopNames.mockReturnValue([]);
      renderModal();
      expect(
        screen.getByText(/No workshops in the catalog yet/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/TTA Admin/i)).toBeInTheDocument();
    });

    test('an existing activity prefills all three links', () => {
      renderModal({
        activity: {
          id: 5, title: 'Workshop at Bhilai', activityTypeId: 1,
          workshopId: 11, trainingProgrammeId: 22, linkedVendorId: 31,
        },
      });
      expect(screen.getByText('Financial Literacy')).toBeInTheDocument();
      expect(screen.getByText('Grassroots Coaching L1')).toBeInTheDocument();
    });

    test('links left blank are sent as null, not as an empty string', () => {
      // Number('') is 0, which is a valid-looking id. Sending 0 or '' would
      // either 400 or point the activity at nothing in particular, so the
      // conversion has to produce a real null.
      const onSave = jest.fn();
      renderModal({ onSave });
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'A trial, no workshop' },
      });
      fireEvent.mouseDown(screen.getByLabelText(/activity type/i));
      fireEvent.click(screen.getByRole('option', { name: /Boys Trial/i }));
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(onSave).toHaveBeenCalledTimes(1);
      const body = onSave.mock.calls[0][0];
      expect(body.workshopId).toBeNull();
      expect(body.trainingProgrammeId).toBeNull();
      expect(body.linkedVendorId).toBeNull();
    });
  });
});
