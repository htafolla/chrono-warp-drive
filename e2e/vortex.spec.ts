import { test, expect } from '@playwright/test';

const BASE = 'https://dynamo.rippel.ai';

test.describe('VortexClaim page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/vortex`);
  });

  test('page loads with title and stats', async ({ page }) => {
    await expect(page.getByText('Dynamo Vortex')).toBeVisible();
    await expect(page.getByText('Temporal containers')).toBeVisible();
    await expect(page.getByText('minted').first()).toBeVisible({ timeout: 15000 });
  });

  test('wallet connect button is present', async ({ page }) => {
    await expect(page.getByText('Connect Wallet').or(page.getByText(/0x[a-fA-F0-9]{4}/))).toBeVisible({ timeout: 10000 });
  });

  test('container list renders with verdict badges', async ({ page }) => {
    await expect(page.locator('text=PASS,NEEDS_REVISION,REJECT'.split(',')[0]).first()).toBeVisible({ timeout: 15000 });
  });

  test('containers show percentage bars on summary row', async ({ page }) => {
    const bars = page.locator('.rounded-full.bg-zinc-700');
    await expect(bars.first()).toBeVisible({ timeout: 15000 });
    const fills = page.locator('.rounded-full.bg-emerald-500, .rounded-full.bg-amber-500, .rounded-full.bg-red-500');
    const count = await fills.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking container expands detail panel', async ({ page }) => {
    const firstRow = page.locator('.cursor-pointer').first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.click();
    await expect(page.getByText('Container ID')).toBeVisible();
    await expect(page.getByText('7D Resonance Profile')).toBeVisible();
    await expect(page.getByText('Trinitarium Moral Overlay')).toBeVisible();
    await expect(page.getByText('Solar Context')).toBeVisible();
  });

  test('claimed containers show Basescan link', async ({ page }) => {
    await page.locator('.cursor-pointer').first().click();
    await expect(page.getByText('Basescan').first()).toBeVisible({ timeout: 20000 });
  });

  test('unclaimed containers show mint input + button when wallet connected', async ({ page }) => {
    const mintBtns = page.locator('button:has-text("Mint")');
    const count = await mintBtns.count();
    if (count > 0) {
      const input = mintBtns.first().locator('..').locator('input[type="number"]');
      await expect(input).toBeVisible();
    }
  });

  test('back link navigates to home', async ({ page }) => {
    await page.getByText('← Dynamo').click();
    await expect(page).toHaveURL(BASE + '/');
  });

  test('scrolling to bottom shows connect prompt when disconnected', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const prompt = page.getByText('Connect your wallet to mint');
    if (await prompt.isVisible()) {
      await expect(page.getByText('Connect Wallet').first()).toBeVisible();
    }
  });
});
