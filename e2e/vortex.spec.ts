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

  test('summary row shows source type and rarity chips', async ({ page }) => {
    await expect(page.getByText('human').or(page.getByText('ambient')).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Celestial').or(page.getByText('Resonant')).or(page.getByText('Unstable')).or(page.getByText('Dissonant')).first()).toBeVisible({ timeout: 10000 });
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

  test('clicking Details opens VortexDetailModal with container info', async ({ page }) => {
    const detailsBtn = page.locator('button:has-text("Details")').first();
    await expect(detailsBtn).toBeVisible({ timeout: 15000 });
    await detailsBtn.click();
    // Modal should show container info
    await expect(page.getByText('Container ID')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('7D Profile')).toBeVisible();
    await expect(page.getByText('TMO Overlay')).toBeVisible();
    await expect(page.getByText('Share on Twitter')).toBeVisible();
    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(page.getByText('Container ID')).not.toBeVisible();
  });

  test('VortexDetailModal shows mint section for unclaimed containers', async ({ page }) => {
    const detailsBtn = page.locator('button:has-text("Details")').first();
    await expect(detailsBtn).toBeVisible({ timeout: 15000 });
    await detailsBtn.click();
    // Check if this container is claimed or unclaimed
    const basescanLink = page.getByText('View on Basescan');
    const mintSection = page.getByText('Mint VortexToken');
    const offchain = page.getByText('Offchain');
    if (await basescanLink.isVisible().catch(() => false)) {
      // Claimed container — verify token image loads
      await expect(page.locator('img[alt*="Vortex"]').first()).toBeVisible({ timeout: 5000 });
    } else if (await mintSection.isVisible().catch(() => false)) {
      // Unclaimed container in registry — check donation input exists
      await expect(page.locator('input[type="number"]').first()).toBeVisible();
      const mintBtn = page.getByText('Mint').or(page.getByText('Connect your wallet'));
      await expect(mintBtn.first()).toBeVisible();
    } else if (await offchain.isVisible().catch(() => false)) {
      // Offchain container — check Save to Chain button
      const saveBtn = page.getByText('Save to Chain').or(page.getByText('Connect your wallet'));
      await expect(saveBtn.first()).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });

  test('clicking Mint opens ClaimModal with ceremony flow', async ({ page }) => {
    const mintBtn = page.locator('button:has-text("Mint")').first();
    const count = await mintBtn.count();
    if (count === 0) {
      console.log('No unclaimed containers — skipping ClaimModal test');
      return;
    }
    await expect(mintBtn).toBeVisible({ timeout: 15000 });
    await mintBtn.click();
    // ClaimModal idle state
    await expect(page.getByText('Claim Vortex')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Composite Score')).toBeVisible();
    await expect(page.getByText('Verdict')).toBeVisible();
    await expect(page.getByText('Donation')).toBeVisible();
    await expect(page.getByText('Begin Ceremony')).toBeVisible();
    // Close without starting ceremony
    await page.keyboard.press('Escape');
    await expect(page.getByText('Claim Vortex')).not.toBeVisible();
  });

  test('scrolling to bottom shows connect prompt when disconnected', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const prompt = page.getByText('Connect your wallet to mint');
    if (await prompt.isVisible()) {
      await expect(page.getByText('Connect Wallet').first()).toBeVisible();
    }
  });

  test('full e2e: pick on-chain unclaimed container → MCP mints → UI shows claimed', async ({ page }) => {
    // Query each potential unclaimed container directly to avoid cache inconsistency
    const statuses = await (await fetch(`${MCP}/vortex/statuses`)).json();
    const candidates: { containerId: string; verdict: string }[] = [];
    for (const [cid, info] of Object.entries(statuses.statuses || {})) {
      const s = info as { claimed: boolean; tokenId: string | null };
      if (!s.claimed) {
        const detail = await (await fetch(`${MCP}/vortex/container/${cid}`)).json();
        if (!detail.hasToken) {
          const verdict = detail.containerData?.verdict || 'PASS';
          candidates.push({ containerId: cid, verdict });
        }
      }
    }

    if (candidates.length === 0) {
      console.log('No unclaimed containers — skipping mint test');
      return;
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
      // Retry up to 3 times for RPC rate limits
      let mint: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 5000));
        const result = await fetch(`${MCP}/vortex/mint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ containerId, to: '0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43' }),
        });
        mint = await result.json();
        if (mint.success) break;
        console.log(`Mint attempt ${attempt + 1} failed, retrying...`);
      }
      expect(mint.success).toBe(true);
      expect(mint.txHash).toBeTruthy();
      console.log(`Minted: tx ${mint.txHash.slice(0, 18)}… tokenId=${mint.tokenId ?? '?'}`);

      // Use tokenId from mint response if available
      tokenId = mint.tokenId || null;

      if (!tokenId) {
        // Retry container check up to 5 times (RPC eventual consistency)
        for (let retry = 0; retry < 5; retry++) {
          const updated = await (await fetch(`${MCP}/vortex/container/${containerId}`)).json();
          tokenId = updated.tokenId;
          if (tokenId) break;
          await new Promise(r => setTimeout(r, 3000));
        }
      }
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
