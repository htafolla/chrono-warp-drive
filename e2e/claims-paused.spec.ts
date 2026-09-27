import { test, expect, type Page, type Route } from '@playwright/test'

const NOTICE = 'Claims are paused while we add signed vouchers.'
const SUBTITLE = 'Temporal containers. Click one to view details.'

const FIXTURE_A = '0x' + 'a1'.repeat(32)
const FIXTURE_B = '0x' + 'b2'.repeat(32)

function fixtureContainer(containerId: string, proposalText: string) {
  return {
    containerId,
    timestamp: 1_700_000_000,
    containerHash: '0x' + '11'.repeat(32),
    source: 'human',
    proposalHash: '0x' + '22'.repeat(32),
    proposalText,
    resonanceProfile: {
      fullBox7DComposite: 0.82,
      fullBox7DVerdict: 'PASS',
      verdict: 'PASS',
      waveProximity: 0.8,
      phaseAlignment: 0.8,
      calibratedVortex: 0.8,
      calibratedSync: 0.8,
      neuralProximity: 0.8,
      neuralVortex: 0.8,
      gematriaResonance: 0.8,
      structuralResonance: 0.8,
      confidence: 0.8,
    },
    moralOverlay: {
      trinitariumMoralScore: 0.8,
      virtueAlignment: 0.8,
      moralSafety: 0.8,
      intentAlignment: 0.8,
      trinitariumGematriaFusion: 0.8,
      moralNumerologicalTension: 'Aligned',
    },
    solarSnapshot: {
      timestamp: 1_700_000_000,
      activityLevel: 'quiet',
      xrayFlux: 0,
      kpIndex: 1,
      solarTdf: 0,
    },
    hammerReason: 'Playwright fixture. Not a live container.',
    vortexMessage: 'Playwright fixture. Not a live container.',
  }
}

const FIXTURES = [
  fixtureContainer(FIXTURE_A, 'Fixture container A for the paused-claims check.'),
  fixtureContainer(FIXTURE_B, 'Fixture container B for the paused-claims check.'),
]

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

async function stubExternal(page: Page, mintRequests: string[], withFixtures: boolean) {
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.startsWith('http://127.0.0.1:8080') || url.startsWith('http://localhost:8080')) {
      return route.continue()
    }
    const type = route.request().resourceType()
    if (type !== 'fetch' && type !== 'xhr' && type !== 'websocket') {
      return route.continue()
    }
    if (url.includes('/vortex/mint')) {
      mintRequests.push(url)
      return fulfillJson(route, { success: false, error: 'mint must not be called' })
    }
    if (!withFixtures) {
      return fulfillJson(route, {})
    }
    if (url.includes('/containers')) {
      return fulfillJson(route, {
        success: true,
        containers: FIXTURES,
        total: FIXTURES.length,
        offset: 0,
        limit: 50,
      })
    }
    if (url.includes('/vortex/statuses')) {
      return fulfillJson(route, {
        success: true,
        statuses: {
          [FIXTURE_A]: { claimed: false, tokenId: null, inRegistry: true },
          [FIXTURE_B]: { claimed: false, tokenId: null, inRegistry: true },
        },
      })
    }
    if (url.includes('/vortex/info')) {
      return fulfillJson(route, { success: true, totalSupply: '0', totalDonations: '0' })
    }
    return fulfillJson(route, {})
  })
}

test('claim page shows the paused notice at desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await stubExternal(page, [], false)
  await page.goto('http://127.0.0.1:8080/vortex', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Dynamo Vortex' })).toBeVisible()
  await expect(page.getByText(SUBTITLE)).toBeVisible()
  await expect(page.getByText(NOTICE)).toBeVisible()
  await page.screenshot({
    path: '/opt/cursor/artifacts/claims_paused_notice.png',
    fullPage: false,
  })
})

test('detail view shows a disabled claim control and cannot mint', async ({ page }) => {
  const mintRequests: string[] = []
  await page.setViewportSize({ width: 1280, height: 800 })
  await stubExternal(page, mintRequests, true)
  await page.goto('http://127.0.0.1:8080/vortex', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(NOTICE).first()).toBeVisible()
  await expect(page.getByText(SUBTITLE)).toBeVisible()
  await expect(page.getByText('Fixture container A for the paused-claims check.')).toBeVisible()

  const cardMint = page.getByRole('button', { name: 'Mint' }).first()
  await expect(cardMint).toBeVisible()
  await expect(cardMint).toBeDisabled()
  await cardMint.click({ force: true })

  await page.getByRole('button', { name: 'Details' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(NOTICE)).toBeVisible()
  const detailMint = dialog.getByRole('button', { name: 'Mint' })
  await expect(detailMint).toBeDisabled()
  await detailMint.scrollIntoViewIfNeeded()
  await detailMint.click({ force: true })
  expect(mintRequests).toEqual([])

  await page.screenshot({
    path: '/opt/cursor/artifacts/claims_paused_detail.png',
    fullPage: false,
  })
})
