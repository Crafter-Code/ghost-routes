import { expect, test, type Page } from '@playwright/test'

const BLOCKED = 'No step-free route to Room 204. The lift is out of service.'

/** The map draws one floor at a time; pick it in the floor switcher. */
async function showFloor(page: Page, floor: number) {
  const tab = page.getByRole('tab', { name: new RegExp(`^Floor ${floor}\\b`) })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

async function open(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Ghost Routes' })).toBeVisible()
}

test('scenario 204 -> lift out -> 104 on the built app', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)

  // Requirement 1: both routes to Room 204, from one graph.
  await expect(page.getByTestId('summary-steps-allowed')).toContainText('Main Entrance (front steps) → Grand Staircase')
  await expect(page.getByTestId('summary-step-free')).toContainText('Side Entrance (ramp) → Lift')
  await expect(page.getByRole('radio', { name: /Step-free/ })).toBeChecked()
  await showFloor(page, 2)
  await expect(page.getByTestId('route-2')).toBeAttached()
  await showFloor(page, 1)
  await expect(page.getByTestId('directions')).toContainText('Take the lift up to Floor 2.')
  await page.screenshot({ path: testInfo.outputPath('1-routes-to-204.png'), fullPage: true })

  // Requirement 2: lift out of service.
  const lift = page.getByRole('button', { name: 'Lift out of service' })
  await lift.click()
  await expect(lift).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').first()).toHaveText(BLOCKED)
  await expect(page.getByTestId('lock-lift-1')).toBeVisible()
  await showFloor(page, 2)
  await expect(page.getByTestId('lock-lift-2')).toBeVisible()
  await showFloor(page, 1)
  await expect(page.getByTestId('summary-step-free')).toHaveText('No route')

  // Steps allowed still reaches Room 204 by the Grand Staircase.
  await page.getByRole('radio', { name: /Steps allowed/ }).check()
  await expect(page.getByRole('status').first()).toContainText('still open via Main Entrance (front steps) → Grand Staircase')
  await expect(page.getByTestId('directions')).toContainText('Take the Grand Staircase up to Floor 2.')
  await page.getByRole('radio', { name: /Step-free/ }).check()

  // Requirement 3: ghost trail on Floor 1 up to the closed lift door; no active route.
  await expect(page.getByTestId('ghost-trail-1')).toBeAttached()
  await expect(page.getByTestId('ghost-end')).toBeVisible()
  await expect(page.getByTestId('route-1')).toHaveCount(0)
  await expect(page.getByText('Ghost trail: the usual step-free route now stops at the lift door on Floor 1.')).toBeVisible()

  // Requirement 4: Room 203 checked and rejected, Room 104 proposed.
  const proposal = page.getByTestId('proposal')
  await expect(proposal).toContainText('Room 203 (Blue Room): no step-free route')
  await expect(proposal).toContainText('Room 104 (Garden Hall): step-free route')
  await page.screenshot({ path: testInfo.outputPath('2-lift-out-ghost.png'), fullPage: true })

  // Requirement 5: confirm the move.
  await page.getByRole('button', { name: 'Move event to Room 104' }).click()
  await expect(page.getByRole('status').first()).toContainText('Event moved to Room 104.')
  await expect(page.getByRole('heading', { name: 'Directions to Room 104' })).toBeFocused()
  await expect(page.getByTestId('route-1')).toBeAttached()
  await expect(page.getByTestId('ghost-trail-1')).toHaveCount(0)
  await expect(page.getByTestId('directions')).toContainText('Walk to Room 104 (Garden Hall).')

  await page.getByRole('button', { name: 'Copy guest directions' }).click()
  await expect(page.getByText('Copied: entrance, floor and steps.')).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('Event: Room 104 (Garden Hall)')
  expect(copied).toContain('Entrance: Side Entrance (ramp, step-free)')
  expect(copied).toContain('Floor: 1')
  expect(copied).toMatch(/^1\. Start at the hotel forecourt\.$/m)
  await page.screenshot({ path: testInfo.outputPath('3-moved-to-104.png'), fullPage: true })

  // Requirement 7: state survives a reload in the same tab, and Reset restores it.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Directions to Room 104' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset scenario' }).click()
  await expect(page.getByRole('heading', { name: 'Directions to Room 204' })).toBeVisible()
  await expect(lift).toHaveAttribute('aria-pressed', 'false')
})

test('a new visitor session starts clean', async ({ browser }) => {
  const first = await browser.newContext()
  const a = await first.newPage()
  await open(a)
  await a.getByRole('button', { name: 'Lift out of service' }).click()
  await expect(a.getByRole('status').first()).toHaveText(BLOCKED)

  const second = await browser.newContext()
  const b = await second.newPage()
  await open(b)
  await expect(b.getByRole('button', { name: 'Lift out of service' })).toHaveAttribute('aria-pressed', 'false')
  await first.close()
  await second.close()
})

test('the scenario works with the keyboard only', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Keyboard check runs on desktop')
  await open(page)
  const lift = page.getByRole('button', { name: 'Lift out of service' })
  await page.keyboard.press('Tab')
  // Tab until the lift toggle has focus.
  for (let i = 0; i < 10 && !(await lift.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(lift).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status').first()).toHaveText(BLOCKED)

  const move = page.getByRole('button', { name: 'Move event to Room 104' })
  for (let i = 0; i < 10 && !(await move.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(move).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Directions to Room 104' })).toBeFocused()
})

test('steps sit beside the map on desktop and under it on a phone', async ({ page }, testInfo) => {
  await open(page)
  const map = await page.getByTestId('floor-1').boundingBox()
  const steps = await page.getByRole('heading', { name: 'Directions to Room 204' }).boundingBox()
  expect(map && steps).toBeTruthy()
  if (testInfo.project.name === 'desktop') {
    expect(steps!.x).toBeGreaterThan(map!.x + map!.width - 1)
  } else {
    expect(steps!.y).toBeGreaterThan(map!.y + map!.height - 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }
})
