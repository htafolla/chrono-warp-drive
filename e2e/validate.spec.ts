import { test, expect } from '@playwright/test';

const BASE = 'https://dynamo.rippel.ai';

test.describe('Dynamo main page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
  });

  test('page loads and shows header', async ({ page }) => {
    await expect(page.getByText('⚡ Dynamo')).toBeVisible();
    await expect(page.getByText('Resonance-Driven')).toBeVisible();
  });

  test('service indicators render', async ({ page }) => {
    await expect(page.getByText('Dynamo MCP')).toBeVisible();
    await expect(page.getByText('Stellar MCP')).toBeVisible();
    await expect(page.getByText('Neural', { exact: false }).first()).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await expect(page.getByText('Docs').first()).toBeVisible();
    await expect(page.getByText('About').first()).toBeVisible();
    await expect(page.getByText('GitHub').first()).toBeVisible();
  });

  test('textarea and submit button exist', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /Deploy the new/);
    await expect(page.getByText('Ask Dynamo')).toBeVisible();
  });

  test('Share publicly checkbox exists and is checked', async ({ page }) => {
    await expect(page.getByText('Share publicly')).toBeVisible();
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test('Post to blockchain checkbox exists and is unchecked', async ({ page }) => {
    await expect(page.getByText('Post to blockchain')).toBeVisible();
    const checkbox = page.locator('input[type="checkbox"]').nth(1);
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test('example proposal buttons render', async ({ page }) => {
    await expect(page.getByText('Deploy the new agent to production')).toBeVisible();
    await expect(page.getByText('Approve multi-agent coordination')).toBeVisible();
  });

  test('submit proposal and see result', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Test proposal: improve system resilience');
    await page.getByText('Ask Dynamo').click();

    await expect(page.getByText('Temporal Document')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Resonance', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Proximity', { exact: true })).toBeVisible();
    await expect(page.getByText('Phase', { exact: true })).toBeVisible();
  });

  test('example proposal click submits', async ({ page }) => {
    await page.getByText('Deploy the new agent to production').click();
    await expect(page.getByText('Temporal Document')).toBeVisible({ timeout: 20000 });
  });

  test('Temporal Manifold section expands', async ({ page }) => {
    await page.getByText('Temporal Manifold').click();
    await expect(page.getByText('24h Field Trend')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Strongest Moments')).toBeVisible({ timeout: 10000 });
  });

  test('Live feed section renders', async ({ page }) => {
    await expect(page.getByText('Live feed')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('TPTT pipeline page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tptt`);
  });

  test('page loads pipeline components', async ({ page }) => {
    await expect(page.getByText('Temporal Record Creator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Proposal or Event Text')).toBeVisible();
  });

  test('create button exists and disabled initially', async ({ page }) => {
    const btn = page.getByText('Create Temporal Record');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toBeDisabled();
  });

  test('pipeline animation shows on submit', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Test proposal for pipeline animation validation');
    await page.getByText('Create Temporal Record').click();

    await expect(page.getByText('Running temporal pipeline…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Solar Ingestion')).toBeVisible();
    await expect(page.getByText('TDF Computation')).toBeVisible();
    await expect(page.getByText('Kuramoto Coupling')).toBeVisible();
    await expect(page.getByText('Wave Propagation')).toBeVisible();
    await expect(page.getByText('Governance Verdict')).toBeVisible();
  });
});
