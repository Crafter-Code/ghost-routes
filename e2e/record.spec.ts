import { expect, test } from '@playwright/test'

/**
 * Short screen recording of the two main transitions, saved only when EVIDENCE_DIR is set:
 * EVIDENCE_DIR=docs/evidence/expansion npm run test:e2e -- e2e/record.spec.ts --project=desktop
 */

const EVIDENCE = process.env.EVIDENCE_DIR

test.use({ video: { mode: 'on', size: { width: 1366, height: 900 } } })
test.skip(({ isMobile }) => isMobile || !EVIDENCE, 'Recorded on desktop only when EVIDENCE_DIR is set')

async function open(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Ghost Routes' })).toBeVisible()
}

const pickScenario = (page: import('@playwright/test').Page, name: RegExp) => page.getByRole('radio', { name }).check()

test('record: detour to Room 206 and the move from 204 to 104', async ({ page }) => {
  await open(page)
  await page.waitForTimeout(600)
  await pickScenario(page, /Gallery door closed/)
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Close central door' }).click()
  await page.waitForTimeout(2600)
  await pickScenario(page, /Lift out, move to Room 104/)
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Lift out of service' }).click()
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: 'Move event to Room 104' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(3600)
  const video = page.video()
  await page.close()
  await video?.saveAs(`${EVIDENCE}/recording-206-detour-and-204-to-104.webm`)
})
