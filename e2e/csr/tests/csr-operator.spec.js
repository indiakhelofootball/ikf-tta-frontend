// CSR Operator — full E2E journey (S1–S10). Internal /csr app only.
// Actor: csr.admin@example.com / Demo-Pass-2026 (role ADMIN, grants csr + csr_certificate).
// Selectors are role/label/text based (the CSR components ship no data-testid).
const { test, expect } = require('@playwright/test');

const OPERATOR = {
  email: process.env.CSR_EMAIL || 'csr.admin@example.com',
  password: process.env.CSR_PASSWORD || 'Demo-Pass-2026',
};

const STAMP = Date.now();
const PROJECT = `E2E Test Project ${STAMP}`;
const CLIENT = 'E2E Funder';
const SANCTIONED = '500000';
const ACTIVITY_TYPE = `E2E Workshop ${STAMP}`;
const ACTIVITY_TITLE = 'Career Guidance Camp';
const REPORT_NAME = 'May Progress Report';
const CONTACT_NAME = 'Priya Sharma';
const EXPENSE_AMOUNT = '250000';

// ---- helpers ---------------------------------------------------------------

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(OPERATOR.email);
  await page.getByLabel('Password', { exact: true }).fill(OPERATOR.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // App redirects ADMIN away from /login (to /dashboard).
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

// Works for both MUI Select and Autocomplete fields.
async function chooseOption(page, label, value) {
  const field = page.getByLabel(label, { exact: false }).first();
  await field.click();
  const option = page.getByRole('option', { name: new RegExp(escapeRe(value), 'i') }).first();
  await option.waitFor({ state: 'visible', timeout: 5_000 });
  await option.click();
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function saveDialog(page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^save$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

async function openProjectDetail(page, name) {
  await page.goto('/csr/projects');
  await expect(page.getByRole('heading', { name: 'CSR Projects' })).toBeVisible();
  await page.getByPlaceholder(/search by project or client/i).fill(name);
  const card = page.locator('.MuiCard-root', { hasText: name }).first();
  await expect(card).toBeVisible();
  await card.getByRole('button').first().click(); // "Open project" is the first icon button
  await expect(page).toHaveURL(/\/csr\/\d+/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

// ---- suite -----------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('CSR operator end-to-end', () => {
  test('S0 — /csr is the CSR app dashboard, in the CSR shell', async ({ page }) => {
    await login(page);
    await page.goto('/csr');
    // The CSR app got its own shell on 2026-08-15: /csr is the dashboard and the
    // project list moved to /csr/projects. Assert the shell, not just the page —
    // a CSR operator must not be looking at TTA's sidebar.
    await expect(page.getByText(/sanctioned vs utilised/i)).toBeVisible({ timeout: 15_000 });
    const sidebar = page.locator('aside.sidebar');
    await expect(sidebar.getByRole('link', { name: 'Projects' })).toBeVisible();
    // Containment: the CSR shell offers no route into the ledger.
    for (const forbidden of ['Payments', 'Vendors', 'Work Orders', 'Banking', 'Courier']) {
      await expect(sidebar.getByRole('link', { name: forbidden })).toHaveCount(0);
    }
  });

  test('S1 — operator reaches the project list (grant works)', async ({ page }) => {
    await login(page);
    await page.goto('/csr/projects');
    await expect(page.getByRole('heading', { name: 'CSR Projects' })).toBeVisible();
  });

  test('S3 — create an activity type in the admin catalog', async ({ page }) => {
    await login(page);
    await page.goto('/csr/activity-types');
    await expect(page.getByRole('heading', { name: 'CSR Activity Types' })).toBeVisible();
    await page.getByLabel('New activity type').fill(ACTIVITY_TYPE);
    await page.getByRole('button', { name: /^add$/i }).click();
    await expect(page.getByText(ACTIVITY_TYPE)).toBeVisible();
  });

  test('S2 — create a CSR project from zero', async ({ page }) => {
    await login(page);
    await page.goto('/csr/projects');
    await page.getByRole('button', { name: /new project/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New CSR Project')).toBeVisible();
    await dialog.getByLabel('Project Name').fill(PROJECT);
    await dialog.getByLabel('Client / Funder').fill(CLIENT);
    await dialog.getByLabel(/Sanctioned Amount/).fill(SANCTIONED);
    await dialog.getByLabel('Description').fill('Created by the CSR operator E2E suite.');
    await saveDialog(page);
    // Round-trips: reappears in the list on reload/search.
    await page.goto('/csr/projects');
    await page.getByPlaceholder(/search by project or client/i).fill(PROJECT);
    await expect(page.getByText(PROJECT)).toBeVisible();
  });

  test('S4/S5 — open the project and add an activity', async ({ page }) => {
    await login(page);
    await openProjectDetail(page, PROJECT);
    await page.getByRole('tab', { name: /Activities/ }).click();
    await page.getByRole('button', { name: /add activity/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Activity')).toBeVisible();
    await dialog.getByLabel('Title').fill(ACTIVITY_TITLE);
    await chooseOption(page, 'Activity Type', ACTIVITY_TYPE);
    await dialog.getByLabel('Location').fill('Bhilai');
    await saveDialog(page);
    await expect(page.getByText(ACTIVITY_TITLE)).toBeVisible();
  });

  test('S6 — add a report and mark it visible to client', async ({ page }) => {
    await login(page);
    await openProjectDetail(page, PROJECT);
    await page.getByRole('tab', { name: /Reports/ }).click();
    await page.getByRole('button', { name: /add report/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Report')).toBeVisible();
    await dialog.getByLabel('Report Name').fill(REPORT_NAME);
    await dialog.getByLabel('Document Link').fill('https://example.com/report.pdf');
    await dialog.getByLabel('Visible to client').check();
    await saveDialog(page);
    await expect(page.getByText(REPORT_NAME)).toBeVisible();
  });

  test('S7 — add a contact', async ({ page }) => {
    await login(page);
    await openProjectDetail(page, PROJECT);
    await page.getByRole('tab', { name: /Contacts/ }).click();
    await page.getByRole('button', { name: /add contact/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Contact')).toBeVisible();
    await dialog.getByLabel('Name').fill(CONTACT_NAME);
    await dialog.getByLabel('Designation').fill('Programme Lead');
    await dialog.getByLabel('Email').fill('priya@acme.org');
    await dialog.getByLabel('Phone').fill('+91 90000 00000');
    await saveDialog(page);
    await expect(page.getByText(CONTACT_NAME)).toBeVisible();
  });

  test('S8 — tag a manual expense (XOR: amount only)', async ({ page }) => {
    await login(page);
    await openProjectDetail(page, PROJECT);
    await page.getByRole('tab', { name: 'Utilisation' }).click();
    await page.getByRole('button', { name: /tag expense/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Tag an Expense')).toBeVisible();
    // Modal defaults to "Link a payment"; switch to manual so the Amount field renders.
    await dialog.getByRole('button', { name: /manual amount/i }).click();
    await dialog.getByLabel(/Amount/).fill(EXPENSE_AMOUNT);
    await dialog.getByLabel(/Note/).fill('Training delivery - Q1');
    // Save button on this modal is labelled "Tag", not "Save".
    await dialog.getByRole('button', { name: /^tag$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    // Utilisation summary reflects the tagged amount (₹2,50,000). The amount also
    // appears on the expense chip, so scope to the "Utilised:" summary line.
    await expect(page.getByText(/Utilised:\s*₹?2,50,000/).first()).toBeVisible();
  });

  test('S9 — generate the Utilisation Certificate (server-summed total)', async ({ page }) => {
    await login(page);
    await openProjectDetail(page, PROJECT);
    await page.getByRole('tab', { name: 'Utilisation' }).click();
    // The certificate is produced as a downloaded PDF (jsPDF doc.save), not on-page text.
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByRole('button', { name: /generate certificate/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/utilisation_certificate/i);
  });

  test('S10 — project remains in the list with correct client', async ({ page }) => {
    await login(page);
    await page.goto('/csr/projects');
    await page.getByPlaceholder(/search by project or client/i).fill(PROJECT);
    const card = page.locator('.MuiCard-root', { hasText: PROJECT }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText(CLIENT)).toBeVisible();
  });
});
