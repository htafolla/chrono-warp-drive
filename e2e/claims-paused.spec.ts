import { test, expect } from '@playwright/test'

const NOTICE = 'Claims are paused while we add signed vouchers.'

test('claim page shows the paused notice at desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith('http://127.0.0.1:8080') || url.startsWith('http://localhost:8080')) {
      return route.continue()
    }
    const type = route.request().resourceType()
    if (type === 'fetch' || type === 'xhr' || type === 'websocket') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    }
    return route.continue()
  })
  await page.goto('http://127.0.0.1:8080/vortex', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Dynamo Vortex' })).toBeVisible()
  await expect(page.getByText(NOTICE)).toBeVisible()
  await page.screenshot({
    path: '/opt/cursor/artifacts/claims_paused_notice.png',
    fullPage: false,
  })
})
