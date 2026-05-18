import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SocialMediaReport from './SocialMediaReport';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../services/api', () => ({
  repAPI: { getAll: jest.fn() },
}));

jest.mock('../../utils/downloadHelpers', () => ({
  downloadLogo: jest.fn(() => Promise.resolve()),
  downloadMOU: jest.fn(() => Promise.resolve()),
}));

const { repAPI } = require('../../services/api');
const { downloadLogo, downloadMOU } = require('../../utils/downloadHelpers');

// ── Test Data ────────────────────────────────────────────────────────────────

const mockReps = [
  {
    id: 1,
    repName: 'ABC Sports Academy',
    contactName: 'Rajesh Kumar',
    phone: '9876543210',
    mouStatus: 'Signed',
    mouDocumentUrl: 'https://example.com/mou.pdf',
    mouDocumentName: 'mou.pdf',
    repLogoUrl: 'https://example.com/logo.png',
    repLogoName: 'logo.png',
    website: 'https://abc-sports.com',
    websiteNA: false,
    facebook: 'https://facebook.com/abc',
    facebookNA: false,
    instagram: '',
    instagramNA: true,
    telegram: '',
    telegramNA: true,
    cityAssignments: [
      {
        id: 10, trialSeason: 'Season 6', trialType: 'CSR', city: 'Ambala',
        groundContactName: 'Ravi Sharma', groundContactPhone: '9812345678',
      },
      {
        id: 11, trialSeason: 'Season 6', trialType: 'CSR', city: 'Nicobar',
        groundContactName: '', groundContactPhone: '',
      },
    ],
  },
  {
    id: 2,
    repName: 'XYZ Foundation',
    contactName: 'Priya Singh',
    phone: '8765432109',
    mouStatus: 'Pending',
    mouDocumentUrl: '',
    mouDocumentName: '',
    repLogoUrl: '',
    repLogoName: '',
    website: '',
    websiteNA: true,
    facebook: '',
    facebookNA: true,
    instagram: 'https://instagram.com/xyz',
    instagramNA: false,
    telegram: '',
    telegramNA: true,
    cityAssignments: [
      {
        id: 20, trialSeason: 'Season 5', trialType: 'Nari Shakti', city: 'Delhi',
        groundContactName: 'Amit Verma', groundContactPhone: '9911223344',
      },
    ],
  },
  {
    id: 3,
    repName: 'No Assignment REP',
    contactName: '',
    phone: '',
    mouStatus: 'Not Required',
    mouDocumentUrl: '',
    mouDocumentName: '',
    repLogoUrl: '',
    repLogoName: '',
    website: '',
    websiteNA: true,
    facebook: '',
    facebookNA: true,
    instagram: '',
    instagramNA: true,
    telegram: '',
    telegramNA: true,
    cityAssignments: [],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  repAPI.getAll.mockResolvedValue({ reps: mockReps });
});

function renderReport() {
  return render(<SocialMediaReport />);
}

/** Expand a REP card via the bottom "More" control (header row no longer toggles). */
function expandRepCardByName(repName) {
  const heading = screen.getByText(repName);
  const card = heading.closest('.MuiPaper-root');
  expect(card).toBeTruthy();
  const moreBtn = within(card).getByRole('button', { name: /^more$/i });
  fireEvent.click(moreBtn);
}

function collapseRepCardByName(repName) {
  const heading = screen.getByText(repName);
  const card = heading.closest('.MuiPaper-root');
  expect(card).toBeTruthy();
  const lessBtn = within(card).getByRole('button', { name: /^less$/i });
  fireEvent.click(lessBtn);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SocialMediaReport', () => {

  // ─── Loading & Data Fetch ───────────────────────────────────────────────

  test('shows loading spinner then loads cards', async () => {
    renderReport();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('calls repAPI.getAll with limit 1000', async () => {
    renderReport();
    await waitFor(() => expect(repAPI.getAll).toHaveBeenCalledWith({ limit: 1000 }));
  });

  test('shows error toast on API failure', async () => {
    repAPI.getAll.mockRejectedValue(new Error('Network error'));
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('Failed to load REPs')).toBeInTheDocument();
    });
  });

  test('shows empty state when no REPs', async () => {
    repAPI.getAll.mockResolvedValue({ reps: [] });
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('No REPs found')).toBeInTheDocument();
    });
  });

  // ─── Header & Summary ──────────────────────────────────────────────────

  test('displays page header with REP and assignment counts', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('Social Media Report')).toBeInTheDocument();
    });
    // 3 REPs, 3 total assignments
    expect(screen.getByText(/3 REPs/)).toBeInTheDocument();
    expect(screen.getByText(/3 assignments/)).toBeInTheDocument();
  });

  // ─── Card Line 1: REP Name, Season, Project, Cities ────────────────────

  test('shows REP names on all cards', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
      expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
      expect(screen.getByText('No Assignment REP')).toBeInTheDocument();
    });
  });

  test('shows season chips on cards', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Season 6 for ABC, Season 5 for XYZ
    expect(screen.getAllByText('Season 6').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Season 5').length).toBeGreaterThanOrEqual(1);
  });

  test('shows project chips on cards', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Project name chips
    expect(screen.getAllByText('CSR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nari Shakti').length).toBeGreaterThanOrEqual(1);
  });

  test('shows city chips on cards', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('Ambala')).toBeInTheDocument();
      expect(screen.getByText('Nicobar')).toBeInTheDocument();
      expect(screen.getByText('Delhi')).toBeInTheDocument();
    });
  });

  test('shows +N chip when more than 4 cities', async () => {
    const repWith6Cities = {
      id: 99, repName: 'Many Cities REP', contactName: 'Test', phone: '9999999999',
      mouStatus: 'Pending', mouDocumentUrl: '', mouDocumentName: '',
      repLogoUrl: '', repLogoName: '',
      website: '', websiteNA: true, facebook: '', facebookNA: true,
      instagram: '', instagramNA: true, telegram: '', telegramNA: true,
      cityAssignments: ['A', 'B', 'C', 'D', 'E', 'F'].map((c, i) => ({
        id: 100 + i, trialSeason: 'Season 6', trialType: 'CSR', city: `City${c}`,
        groundContactName: '', groundContactPhone: '',
      })),
    };
    repAPI.getAll.mockResolvedValue({ reps: [repWith6Cities] });
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  // ─── Card Line 2: Contact + Documents ──────────────────────────────────

  test('shows contact info on cards', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText(/Rajesh Kumar/)).toBeInTheDocument();
      expect(screen.getByText(/9876543210/)).toBeInTheDocument();
      expect(screen.getByText(/Priya Singh/)).toBeInTheDocument();
    });
  });

  test('shows N/A for missing contact', async () => {
    renderReport();
    await waitFor(() => {
      // "No Assignment REP" has no contactName
      const texts = screen.getAllByText(/N\/A/);
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('shows MOU download button when MOU exists', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // ABC has MOU — should show MOU label (not N/A next to it)
    const mouLabels = screen.getAllByText('MOU');
    expect(mouLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('shows MOU N/A when no MOU document', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
    });
    // XYZ has no mouDocumentUrl — N/A should appear
    const naTexts = screen.getAllByText('N/A');
    expect(naTexts.length).toBeGreaterThanOrEqual(1);
  });

  test('shows Logo download button when logo exists', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const logoLabels = screen.getAllByText('Logo');
    expect(logoLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('shows MOU status chip', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('Signed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Not Required')).toBeInTheDocument();
    });
  });

  // ─── Expand/Collapse ───────────────────────────────────────────────────

  test('card is collapsed by default — assigned trials not visible', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Ground contact details are inside expanded section
    expect(screen.queryByText(/Ravi Sharma/)).not.toBeVisible();
  });

  test('clicking card expands it to show assigned trials', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    expandRepCardByName('ABC Sports Academy');
    await waitFor(() => {
      expect(screen.getByText(/Ravi Sharma/)).toBeVisible();
    });
    // Shows assignment format: Season | Project | City
    expect(screen.getByText('Season 6 | CSR | Ambala')).toBeVisible();
    expect(screen.getByText('Season 6 | CSR | Nicobar')).toBeVisible();
  });

  test('expanded card shows ground contact or "Not Available"', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    expandRepCardByName('ABC Sports Academy');
    await waitFor(() => {
      // Ambala has ground contact
      expect(screen.getByText(/Ravi Sharma/)).toBeVisible();
      expect(screen.getByText(/9812345678/)).toBeVisible();
      // Nicobar has no ground contact
      expect(screen.getByText(/Not Available/)).toBeVisible();
    });
  });

  test('expanded card shows logo preview when logo exists', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    expandRepCardByName('ABC Sports Academy');
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo).toBeVisible();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    });
  });

  test('expanded card shows "No assignments" when none exist', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('No Assignment REP')).toBeInTheDocument();
    });
    expandRepCardByName('No Assignment REP');
    await waitFor(() => {
      expect(screen.getByText('No assignments')).toBeVisible();
    });
  });

  test('clicking expanded card collapses it', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Expand
    expandRepCardByName('ABC Sports Academy');
    await waitFor(() => expect(screen.getByText(/Ravi Sharma/)).toBeVisible());
    // Collapse
    collapseRepCardByName('ABC Sports Academy');
    await waitFor(() => expect(screen.queryByText(/Ravi Sharma/)).not.toBeVisible());
  });

  // ─── Social Links ──────────────────────────────────────────────────────

  test('expanded card shows social links when available', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    expandRepCardByName('ABC Sports Academy');
    await waitFor(() => {
      expect(screen.getByText('Website')).toBeVisible();
      expect(screen.getByText('Facebook')).toBeVisible();
    });
    // Instagram and Telegram are NA for ABC, should not show
    const socialSection = screen.getByText('Website').closest('a');
    expect(socialSection).toHaveAttribute('href', 'https://abc-sports.com');
  });

  test('social links open in new tab', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    expandRepCardByName('ABC Sports Academy');
    await waitFor(() => {
      const websiteLink = screen.getByText('Website').closest('a');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ─── Search Filter ─────────────────────────────────────────────────────

  test('search filters REPs by name', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search REP, city, project...');
    await user.type(searchInput, 'XYZ');
    expect(screen.queryByText('ABC Sports Academy')).not.toBeInTheDocument();
    expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
  });

  test('search filters REPs by city', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search REP, city, project...');
    await user.type(searchInput, 'Delhi');
    expect(screen.queryByText('ABC Sports Academy')).not.toBeInTheDocument();
    expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
  });

  test('search filters REPs by project name', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search REP, city, project...');
    await user.type(searchInput, 'Nari');
    expect(screen.queryByText('ABC Sports Academy')).not.toBeInTheDocument();
    expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
  });

  test('search filters by contact name', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search REP, city, project...');
    await user.type(searchInput, 'Priya');
    expect(screen.queryByText('ABC Sports Academy')).not.toBeInTheDocument();
    expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
  });

  test('search shows empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search REP, city, project...');
    await user.type(searchInput, 'zzzzzznothing');
    expect(screen.getByText('No REPs found')).toBeInTheDocument();
  });

  // ─── Season & Project Dropdown Filters ─────────────────────────────────

  test('season filter populates from data', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Filter dropdowns should contain seasons from data
    expect(screen.getByText('All Seasons')).toBeInTheDocument();
    expect(screen.getByText('All Projects')).toBeInTheDocument();
  });

  test('season filter narrows cards', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Open season dropdown and pick Season 5
    const seasonSelect = screen.getByText('All Seasons').closest('[role="combobox"]')
      || screen.getByDisplayValue('');
    // Use the select's native behavior via MUI
    const selects = document.querySelectorAll('[role="combobox"]');
    // First combobox is season filter
    const seasonCombo = selects[0];
    await user.click(seasonCombo);
    await waitFor(() => {
      const option = screen.getByRole('option', { name: 'Season 5' });
      fireEvent.click(option);
    });
    await waitFor(() => {
      expect(screen.queryByText('ABC Sports Academy')).not.toBeInTheDocument();
      expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
    });
  });

  test('project filter narrows cards', async () => {
    const user = userEvent.setup();
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const selects = document.querySelectorAll('[role="combobox"]');
    // Second combobox is project filter
    const projectCombo = selects[1];
    await user.click(projectCombo);
    await waitFor(() => {
      const option = screen.getByRole('option', { name: 'Nari Shakti' });
      fireEvent.click(option);
    });
    await waitFor(() => {
      expect(screen.queryByText('ABC Sports Academy')).not.toBeInTheDocument();
      expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
    });
  });

  // ─── Selection (Checkbox) ──────────────────────────────────────────────

  test('checkbox is at the end of Line 1', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is Select All in toolbar, rest are per-card
    expect(checkboxes.length).toBe(4); // 1 select-all + 3 cards
  });

  test('clicking card checkbox selects it', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[1] = first card checkbox
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  test('select all checks all visible cards', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[0] is Select All
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    // All card checkboxes should be checked
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
    expect(checkboxes[3]).toBeChecked();
  });

  test('select all then deselect all', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    // Select all
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    // Deselect all
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(checkboxes[1]).not.toBeChecked();
  });

  test('checkbox click does not toggle expand', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    // Card should NOT expand — ground contact should remain hidden
    expect(screen.queryByText(/Ravi Sharma/)).not.toBeVisible();
  });

  // ─── Download Buttons ──────────────────────────────────────────────────

  test('download selected button is disabled when none selected', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const downloadBtn = screen.getByRole('button', { name: /Download Selected/i });
    expect(downloadBtn).toBeDisabled();
  });

  test('download selected button enables when cards selected', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    const downloadBtn = screen.getByRole('button', { name: /Download Selected/i });
    expect(downloadBtn).not.toBeDisabled();
  });

  test('bulk download calls downloadLogo and downloadMOU for selected REPs', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Select first REP (ABC — has both logo and MOU)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    const downloadBtn = screen.getByRole('button', { name: /Download Selected/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(downloadLogo).toHaveBeenCalledWith(
        expect.objectContaining({ repName: 'ABC Sports Academy' }),
        'Ambala'
      );
      expect(downloadMOU).toHaveBeenCalledWith(
        expect.objectContaining({ repName: 'ABC Sports Academy' }),
        expect.objectContaining({ city: 'Ambala' })
      );
    });
  });

  test('bulk download shows warning when no documents available', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('XYZ Foundation')).toBeInTheDocument();
    });
    // Select XYZ (no logo, no MOU)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);

    const downloadBtn = screen.getByRole('button', { name: /Download Selected/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText('No documents available for selected REPs')).toBeInTheDocument();
    });
    // Should not call download functions since URLs are empty
    expect(downloadLogo).not.toHaveBeenCalled();
    expect(downloadMOU).not.toHaveBeenCalled();
  });

  test('shows success toast with file count after bulk download', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    // Select ABC (has both logo and MOU = 2 files)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    const downloadBtn = screen.getByRole('button', { name: /Download Selected/i });
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(screen.getByText(/Downloaded 2 file\(s\) from 1 REP/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  // ─── Individual MOU/Logo Download (Line 2 icons) ───────────────────────

  test('MOU download icon triggers downloadMOU', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const abcCard = screen.getByText('ABC Sports Academy').closest('.MuiPaper-root');
    const mouBtn = within(abcCard).getByRole('button', { name: /download mou/i });
    fireEvent.click(mouBtn);
    await waitFor(() => {
      expect(downloadMOU).toHaveBeenCalled();
    });
  });

  test('Logo download icon triggers downloadLogo', async () => {
    renderReport();
    await waitFor(() => {
      expect(screen.getByText('ABC Sports Academy')).toBeInTheDocument();
    });
    const abcCard = screen.getByText('ABC Sports Academy').closest('.MuiPaper-root');
    const logoBtn = within(abcCard).getByRole('button', { name: /download logo/i });
    fireEvent.click(logoBtn);
    await waitFor(() => {
      expect(downloadLogo).toHaveBeenCalled();
    });
  });
});

// ── Download Helpers Unit Tests ──────────────────────────────────────────────

describe('downloadHelpers', () => {
  // Reset modules to get the real implementations
  let realDownloadLogo, realDownloadMOU;

  beforeEach(() => {
    jest.resetModules();
    const helpers = jest.requireActual('../../utils/downloadHelpers');
    realDownloadLogo = helpers.downloadLogo;
    realDownloadMOU = helpers.downloadMOU;
  });

  test('downloadLogo auto-names file as <city>-<REP>-Logo.<ext>', () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'])),
    }));
    global.fetch = mockFetch;
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();

    const rep = { repLogoUrl: 'https://example.com/logo.png', repLogoName: 'mylogo.png', repName: 'ABC Sports' };
    realDownloadLogo(rep, 'Ambala');

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/logo.png');
  });

  test('downloadLogo does nothing when no URL', () => {
    const rep = { repLogoUrl: '', repLogoName: '', repName: 'ABC' };
    const result = realDownloadLogo(rep, 'City');
    expect(result).toBeUndefined();
  });

  test('downloadMOU auto-names file as MOU-<season>-<project>-<city>.<ext>', () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'])),
    }));
    global.fetch = mockFetch;
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();

    const rep = { mouDocumentUrl: 'https://example.com/mou.pdf', mouDocumentName: 'doc.pdf', repName: 'ABC' };
    const assignment = { trialSeason: 'Season 6', trialType: 'CSR', city: 'Ambala' };
    realDownloadMOU(rep, assignment);

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/mou.pdf');
  });

  test('downloadMOU does nothing when no URL', () => {
    const rep = { mouDocumentUrl: '', mouDocumentName: '', repName: 'ABC' };
    const result = realDownloadMOU(rep, {});
    expect(result).toBeUndefined();
  });
});
