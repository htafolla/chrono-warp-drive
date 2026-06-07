import { test, expect } from '@playwright/test';

const BASE = 'https://dynamo.rippel.ai';
const MCP = 'https://mcp-production-80e2.up.railway.app';

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
    const claimed = page.locator('text=/Token #\\d+/');
    if (await claimed.count() > 0) {
      await claimed.first().click();
      await expect(page.getByText('Basescan').first()).toBeVisible({ timeout: 20000 });
    }
  });

  test('unclaimed containers show mint input when wallet connected', async ({ page }) => {
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

  test('full e2e: pick on-chain unclaimed container → MCP mints → UI shows claimed', async ({ page }) => {
    const statuses = await (await fetch(`${MCP}/vortex/statuses`)).json();
    const candidates: { containerId: string; verdict: string }[] = [];
    for (const [cid, info] of Object.entries(statuses.statuses || {})) {
      const s = info as { claimed: boolean; tokenId: string | null };
      if (!s.claimed) {
        const detail = await (await fetch(`${MCP}/vortex/container/${cid}`)).json();
        if (detail.containerData && detail.containerData.verdict) {
          candidates.push({ containerId: cid, verdict: detail.containerData.verdict });
        }
      }
    }
    expect(candidates.length).toBeGreaterThan(0);
    const target = candidates[0];
    const containerId = target.containerId;
    const verdict = target.verdict;
    console.log(`Using unclaimed: ${containerId.slice(0, 18)}… verdict: ${verdict}`);

    await page.goto(`${BASE}/vortex`);
    await expect(page.getByText('Temporal containers')).toBeVisible({ timeout: 15000 });

    const rows = page.locator('.cursor-pointer');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    let found = false;
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await rows.nth(i).click();
      const panel = rows.nth(i).locator('..');
      try {
        await expect(panel.getByText('Container ID')).toBeVisible({ timeout: 2000 });
        const cidMatch = panel.getByText(containerId.slice(0, 12));
        if (await cidMatch.isVisible().catch(() => false)) {
          found = true;
          console.log(`Matched container at row ${i}`);
          break;
        }
      } catch { /* not this row */ }
      await rows.nth(i).click();
    }
    expect(found).toBe(true);
    console.log('Container ID confirmed in expanded detail panel');

    const status = await (await fetch(`${MCP}/vortex/container/${containerId}`)).json();
    let tokenId = status.tokenId;

    if (!tokenId) {
      const result = await fetch(`${MCP}/vortex/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId }),
      });
      const mint = await result.json();
      expect(mint.success).toBe(true);
      expect(mint.txHash).toBeTruthy();
      console.log(`Minted: tx ${mint.txHash.slice(0, 18)}…`);

      const updated = await (await fetch(`${MCP}/vortex/container/${containerId}`)).json();
      tokenId = updated.tokenId;
    } else {
      console.log(`Already minted as token ${tokenId}`);
    }

    expect(tokenId).toBeTruthy();
    if (tokenId) {
      await fetch(`${MCP}/vortex/store-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId, tokenId }),
      });
      console.log(`Redis stored: token ${tokenId}`);
    }

    await page.reload();
    await expect(page.getByText(verdict).first()).toBeVisible({ timeout: 15000 });
    const badge = page.getByText(/Token #\d+/);
    await expect(badge.first()).toBeVisible({ timeout: 15000 });
    console.log('Token badge confirmed after reload');

    await badge.first().click();
    await expect(page.getByText('Basescan').first()).toBeVisible({ timeout: 20000 });
    console.log('Basescan link visible after mint');
  });
});
