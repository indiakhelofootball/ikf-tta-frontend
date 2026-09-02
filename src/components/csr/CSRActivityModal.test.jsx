import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRActivityModal from './CSRActivityModal';

jest.mock('../../services/api', () => ({
  trialsAPI: { getAll: jest.fn(() => Promise.resolve([])) },
  csrAPI: { partnerVendors: { getAll: jest.fn(() => Promise.resolve([])) } },
  vendorsAPI: { getAll: jest.fn(() => Promise.resolve([])) },
}));

jest.mock('../../utils/adminStorage', () => ({
  getWorkshopNames: jest.fn(() => []),
  getTrainingProgrammes: jest.fn(() => []),
  subscribeConfig: jest.fn(() => () => {}),
  getConfigVersion: jest.fn(() => 0),
}));

const { trialsAPI, csrAPI, vendorsAPI } = require('../../services/api');
const adminStorage = require('../../utils/adminStorage');

describe('CSRActivityModal', () => {
  const types = [{ id: 1, name: 'Boys Trial' }];

  // CRA's jest config sets resetMocks: true, which strips a jest.mock factory's
  // implementation before every test. Defaults belong here, not in the factory.
  beforeEach(() => {
    trialsAPI.getAll.mockResolvedValue([]);
    csrAPI.partnerVendors.getAll.mockResolvedValue([]);
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
    // Fields now show per activity kind (26 Aug review, item N1), so this
    // block needs one type per kind rather than the trial-only fixture used
    // elsewhere in the file.
    const types = [
      { id: 1, name: 'Boys Trial' },
      { id: 2, name: 'Community Workshop' },
      { id: 3, name: 'Skill Training' },
    ];

    beforeEach(() => {
      adminStorage.getWorkshopNames.mockReturnValue([
        { id: 11, name: 'Financial Literacy' },
      ]);
      adminStorage.getTrainingProgrammes.mockReturnValue([
        { id: 22, name: 'Grassroots Coaching L1' },
      ]);
      // The endpoint returns partner-flagged vendors only; the narrowing is its
      // job, not this component's.
      csrAPI.partnerVendors.getAll.mockResolvedValue([
        { id: 31, vendorName: 'Partner Co', partnerCategory: 'Financial' },
      ]);
    });


    const renderModal = (props = {}) => render(
      <CSRActivityModal
        open activity={null} activityTypes={types}
        onClose={() => {}} onSave={() => {}} saving={false}
        {...props}
      />
    );

    test('offers the partner vendors the endpoint returns', async () => {
      renderModal();
      const picker = screen.getByLabelText(/^partner$/i);
      fireEvent.mouseDown(picker);
      fireEvent.change(picker, { target: { value: '' } });
      expect(await screen.findByText(/Partner Co/)).toBeInTheDocument();
    });

    test('fills the picker from the narrow endpoint, never the vendors module', async () => {
      // A CSR operator holds no vendors grant, and the agreed documents put the
      // vendor module out of scope for CSR. Reaching for /api/vendors/ here
      // would 403 in production and be wrong even if it did not.
      renderModal();
      await waitFor(() => expect(csrAPI.partnerVendors.getAll).toHaveBeenCalled());
      expect(vendorsAPI.getAll).not.toHaveBeenCalled();
    });

    test('an empty catalog says where the entries are maintained', () => {
      adminStorage.getWorkshopNames.mockReturnValue([]);
      renderModal();
      // The Workshop field only shows for a workshop-kind type.
      fireEvent.mouseDown(screen.getByLabelText(/activity type/i));
      fireEvent.click(screen.getByRole('option', { name: /Community Workshop/i }));
      // Named in full: the partner picker now also points at TTA Admin, so a
      // bare /TTA Admin/ match would pass on the wrong field's helper text.
      expect(
        screen.getByText(/No workshops in the catalog yet — an admin adds them in TTA Admin/i)
      ).toBeInTheDocument();
    });

    test('an existing workshop activity prefills the workshop and partner', () => {
      renderModal({
        activity: {
          id: 5, title: 'Workshop at Bhilai', activityTypeId: 2,
          workshopId: 11, linkedVendorId: 31,
        },
      });
      expect(screen.getByText('Financial Literacy')).toBeInTheDocument();
    });

    test('an existing training activity prefills the training programme', () => {
      renderModal({
        activity: {
          id: 6, title: 'Coaching cohort', activityTypeId: 3,
          trainingProgrammeId: 22,
        },
      });
      expect(screen.getByText('Grassroots Coaching L1')).toBeInTheDocument();
    });

    test('switching from a workshop type to a trial type clears the workshop id', () => {
      // Otherwise the stale workshop id rides along under a trial and the
      // serializer, which validates these per-category, rejects it.
      const onSave = jest.fn();
      renderModal({ onSave });
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Switched type' } });
      fireEvent.mouseDown(screen.getByLabelText(/activity type/i));
      fireEvent.click(screen.getByRole('option', { name: /Community Workshop/i }));
      fireEvent.mouseDown(screen.getByLabelText(/^workshop$/i));
      fireEvent.click(screen.getByRole('option', { name: /Financial Literacy/i }));

      fireEvent.mouseDown(screen.getByRole('combobox', { name: /activity type/i }));
      fireEvent.click(screen.getByRole('option', { name: /Boys Trial/i }));
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].workshopId).toBeNull();
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

    // 26 Aug, 15:39-15:47: a training programme is delivered by someone too --
    // "after that, who is its partner? Is it self or who?" The first cut of the
    // cascade gave Self/Partner to workshop alone, which left a
    // partner-delivered training impossible to record at all.
    test('a training programme also asks who delivered it', () => {
      renderModal();
      fireEvent.mouseDown(screen.getByLabelText(/activity type/i));
      fireEvent.click(screen.getByRole('option', { name: /Skill Training/i }));

      expect(screen.getByLabelText(/training programme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/delivered by/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^partner$/i)).toBeInTheDocument();
      // and still not the workshop catalogue, which belongs to another kind
      expect(screen.queryByLabelText(/^workshop$/i)).toBeNull();
    });
  });

  // Self vs Partner. The point of the field is that an empty partner stops
  // meaning two different things, so these cover what each state may mean.
  describe('delivery mode', () => {
    // Delivered By / Partner show for workshop and generic kinds, not trial --
    // so this block needs its own type whose name doesn't match any keyword.
    const types = [{ id: 1, name: 'Community Engagement' }];

    const renderModal = (props = {}) => render(
      <CSRActivityModal
        open activity={null} activityTypes={types}
        onClose={() => {}} onSave={() => {}} saving={false}
        {...props}
      />
    );

    const fillRequired = () => {
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'A workshop' } });
      fireEvent.mouseDown(screen.getByLabelText(/activity type/i));
      fireEvent.click(screen.getByRole('option', { name: /Community Engagement/i }));
    };

    const pickMode = (label) => {
      fireEvent.mouseDown(screen.getByLabelText(/delivered by/i));
      fireEvent.click(screen.getByRole('option', { name: label }));
    };

    test('Self saves with no partner', () => {
      const onSave = jest.fn();
      renderModal({ onSave });
      fillRequired();
      pickMode(/Self/i);
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].deliveryMode).toBe('Self');
      expect(onSave.mock.calls[0][0].linkedVendorId).toBeNull();
    });

    test('Partner without a named partner is refused before the round trip', () => {
      const onSave = jest.fn();
      renderModal({ onSave });
      fillRequired();
      pickMode(/Partner/i);
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(/Name the partner, or set delivery to Self/i)).toBeInTheDocument();
    });

    test('blank mode still saves, for activities that predate the field', () => {
      const onSave = jest.fn();
      renderModal({ onSave });
      fillRequired();
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].deliveryMode).toBe('');
    });

    // 26 Aug review, 10:10: "activity has one date, below it a start date, why
    // are you writing both?" The form asked three. Pinned as a COUNT, because
    // the failure mode is a third date creeping back and it has already
    // happened once on the contract form.
    describe('two dates, never three', () => {
      test('the form offers exactly Start and End', () => {
        renderModal();
        const dateLabels = screen
          .getAllByText(/date/i)
          .map((el) => el.textContent.trim())
          .filter((t) => /date/i.test(t));

        expect(dateLabels).toEqual(
          expect.arrayContaining(['Start Date', 'End Date']),
        );
        expect(screen.queryByLabelText(/^date$/i)).toBeNull();
        expect(screen.queryByLabelText(/multi-month/i)).toBeNull();
      });

      test('the start date is the authority — date follows it, never diverges', () => {
        const onSave = jest.fn();
        renderModal({ onSave });
        fillRequired();
        fireEvent.change(screen.getByLabelText(/start date/i), {
          target: { value: '2026-09-09' },
        });
        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        const payload = onSave.mock.calls[0][0];
        expect(payload.startDate).toBe('2026-09-09');
        expect(payload.date).toBe('2026-09-09');
      });

      test('a row carrying only the old single date loads into Start', () => {
        renderModal({ activity: { id: 5, title: 'Old one', activityTypeId: 1, date: '2026-05-05' } });
        expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-05-05');
      });
    });
  });
});
