// CSR Client Portal — funder E2E (F1–F6). External /client surface only.
// Actor: funder@example.com / Demo-Pass-2026 (role CSR_CLIENT, no csr grant).
// This suite proves the isolation boundary IN THE BROWSER: a funder sees only
// their own project + published reports, and never any financial/vendor data
// or the internal /csr app.
const { test, expect } = require('@playwright/test');

const FUNDER = {
  email: process.env.FUNDER_EMAIL || 'funder@example.com',
  password: process.env.FUNDER_PASSWORD || 'Demo-Pass-2026',
  slug: process.env.FUNDER_SLUG || 'acme',
};

async function funderLogin(page) {
  await page.goto(`/client/${FUNDER.slug}/login`);
  await page.getByLabel('Email').fill(FUNDER.email);
  await page.getByLabel('Password').fill(FUNDER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/client$/, { timeout: 20_000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('CSR client portal — funder isolation', () => {
  test('F1 — branded login renders (pre-auth branding by slug)', async ({ page }) => {
    await page.goto(`/client/${FUNDER.slug}/login`);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('F2 — funder logs in and lands on the portal', async ({ page }) => {
    await funderLogin(page);
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /My Project/i })).toBeVisible();
  });

  test('F3 — funder sees ONLY their own project (Acme)', async ({ page }) => {
    await funderLogin(page);
    await page.getByRole('tab', { name: /My Project/i }).click();
    // The My Project tab renders the funder's own project fields (name shows in the
    // branded header, not the tab body): Funder, Sanctioned, Status, dates.
    await expect(page.getByText('Funder')).toBeVisible();
    await expect(page.getByText('Acme Foundation').first()).toBeVisible(); // funder name (header + field)
    await expect(page.getByText('Sanctioned')).toBeVisible();
    await expect(page.getByText(/10,00,000/)).toBeVisible();           // their sanctioned amount
  });

  test('F4 — Reports tab shows the PUBLISHED report, not the hidden draft', async ({ page }) => {
    await funderLogin(page);
    await page.getByRole('tab', { name: /Reports/i }).click();
    await expect(page.getByText(/Career Guidance/i)).toBeVisible();      // published
    await expect(page.getByText(/Internal draft/i)).toHaveCount(0);      // hidden — never leaks
  });

  test('F5 — NO financial/vendor data anywhere in the portal', async ({ page }) => {
    await funderLogin(page);
    for (const tabName of [/My Project/i, /Activities/i, /Reports/i]) {
      await page.getByRole('tab', { name: tabName }).click();
      const body = (await page.locator('body').innerText()).toLowerCase();
      for (const forbidden of ['vendor', 'payment request', 'expense tag', 'tds', 'ifsc', 'account number', 'gross amount']) {
        expect(body, `funder portal must not expose "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });

  test('F6 — funder is BLOCKED from the internal /csr app', async ({ page }) => {
    await funderLogin(page);
    await page.goto('/csr');
    // Not a CSR-granted user → must NOT see the operator projects screen.
    await expect(page.getByRole('heading', { name: 'CSR Projects' })).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/csr$/);
  });
});
