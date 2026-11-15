import { expect, test, type Page } from '@playwright/test'

/**
 * Haunted Hotel Expansion on the production build (.kiro/specs/haunted-hotel-expansion/).
 * Set EVIDENCE_DIR to also save the review screenshots there, for example
 * EVIDENCE_DIR=docs/evidence/expansion npm run test:e2e
 */

const EVIDENCE = process.env.EVIDENCE_DIR

async function open(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Ghost Routes' })).toBeVisible()
}

const tab = (page: Page, floor: number) => page.getByRole('tab', { name: new RegExp(`^Floor ${floor}\\b`) })

async function showFloor(page: Page, floor: number) {
  await tab(page, floor).click()
  await expect(tab(page, floor)).toHaveAttribute('aria-selected', 'true')
}

async function pickScenario(page: Page, name: RegExp) {
  await page.getByRole('radio', { name }).check()
}

async function evidence(page: Page, name: string, fullPage = false) {
  if (!EVIDENCE) return
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${EVIDENCE}/${name}`, fullPage })
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

const status = (page: Page) => page.getByRole('status').first()

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop layout checks')

  test('three columns: controls left, the map in the middle, the steps right', async ({ page }) => {
    await open(page)
    const controls = await page.getByRole('group', { name: 'Scenario' }).boundingBox()
    const map = await page.getByRole('tabpanel').boundingBox()
    const steps = await page.getByRole('heading', { name: 'Directions to Room 204' }).boundingBox()
    expect(controls!.x + controls!.width).toBeLessThanOrEqual(map!.x)
    expect(map!.x + map!.width).toBeLessThanOrEqual(steps!.x)
    // The map is the widest column.
    expect(map!.width).toBeGreaterThan(controls!.width * 1.5)
    expect(map!.width).toBeGreaterThan(steps!.width * 1.5)
    await noSidewaysScroll(page)
  })

  test('lift out: dashed trail to the lift door on Floor 1, then the move to Room 104', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Lift out of service' }).click()
    await expect(status(page)).toHaveText('No step-free route to Room 204. The lift is out of service.')
    await expect(tab(page, 1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('ghost-trail-1')).toBeAttached()
    await expect(page.getByTestId('route-1')).toHaveCount(0)
    await expect(page.getByTestId('failure-marker')).toContainText('Lift out of service')
    await expect(page.getByRole('img', { name: /dashed ghost trail .* ends at the lift door on Floor 1/ })).toBeVisible()
    await evidence(page, 'desktop-floor-1-lift-out.png')

    await page.getByRole('button', { name: 'Move event to Room 104' }).click()
    await expect(page.getByRole('heading', { name: 'Directions to Room 104' })).toBeFocused()
    await expect(status(page)).toHaveText('Event moved to Room 104. Step-free route ready via Side Entrance (ramp).')
    await expect(page.getByTestId('route-1')).toBeAttached()
    await expect(page.getByTestId('ghost-trail-1')).toHaveCount(0)
    await expect(page.getByTestId('directions')).toContainText('Walk to Room 104 (Garden Hall).')
  })

  test('gallery door: solid detour by the Gallery Walk, "Door closed" marker, no dashes', async ({ page }) => {
    await open(page)
    await pickScenario(page, /Gallery door closed/)
    await expect(tab(page, 2)).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('button', { name: 'Close central door' }).click()
    await expect(status(page)).toHaveText(
      'The central door to the Portrait Gallery is closed. Your route to Room 206 is still open via Side Entrance (ramp) → Lift → Gallery Walk. It adds 1 min 11 s.',
    )
    // Changing a closure does not move the map.
    await expect(tab(page, 2)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('route-2')).toBeAttached()
    await expect(page.getByTestId('ghost-trail-2')).toHaveCount(0)
    await expect(page.getByTestId('failure-marker')).toContainText('Door closed')
    await expect(page.getByTestId('lock-door-206-north')).toBeVisible()
    await expect(page.getByTestId('ghost-note')).toHaveText(
      'Door closed at the central corridor on Floor 2. The solid line takes the way round.',
    )
    await evidence(page, 'desktop-floor-2-gallery-detour.png')
  })

  test('a text step opens Floor 3, highlights its part and keeps focus on the step', async ({ page }) => {
    await open(page)
    await pickScenario(page, /Gallery door closed/)
    await page.getByRole('button', { name: 'Close central door' }).click()
    await page.getByRole('button', { name: 'Close Gallery Walk door' }).click()
    const proposal = page.getByTestId('proposal')
    await expect(proposal).toContainText('Room 302 (Moonlight Hall): step-free route, 3 min 40 s')
    await page.getByRole('button', { name: 'Move event to Room 302' }).click()
    await expect(status(page)).toHaveText('Event moved to Room 302. Step-free route ready via Side Entrance (ramp) → Lift.')
    await expect(tab(page, 3)).toHaveAttribute('aria-selected', 'true')

    await showFloor(page, 1)
    const lift = page.getByRole('button', { name: 'Take the lift up to Floor 3.' })
    await lift.click()
    await expect(lift).toBeFocused()
    await expect(lift).toHaveAttribute('aria-current', 'step')
    await expect(tab(page, 3)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('highlight-3')).toBeAttached()
    await expect(page.getByTestId('floor-change-lift-3')).toHaveText('from Floor 1')

    const last = page.getByRole('button', { name: 'Walk to Room 302 (Moonlight Hall).' })
    await last.click()
    await expect(last).toHaveAttribute('aria-current', 'step')
    await expect(lift).not.toHaveAttribute('aria-current', 'step')
    await expect(page.getByTestId('route-3')).toBeAttached()

    const ramp = page.getByRole('button', { name: 'Take the side ramp to the Side Entrance. No steps.' })
    await ramp.click()
    await expect(tab(page, 1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('highlight-1')).toBeAttached()
    await expect(page.getByTestId('floor-change-lift-1')).toHaveText('↑ Floor 3')

    await last.click()
    await evidence(page, 'desktop-floor-3-moved-302.png')
  })

  test('Side Entrance closed: the Garden Entrance route and the entrance check', async ({ page }) => {
    await open(page)
    await pickScenario(page, /Side Entrance closed/)
    await page.getByRole('button', { name: 'Close Side Entrance' }).click()
    await expect(status(page)).toHaveText(
      'The Side Entrance is closed. Your route to Room 204 is still open via Garden Entrance (level) → Lift. It adds 25 s.',
    )
    const checks = page.getByTestId('entrance-checks')
    await expect(checks).toContainText('Main Entrance: front steps')
    await expect(checks).toContainText('Side Entrance: closed')
    await expect(checks).toContainText('Garden Entrance: step-free route, 2 min 45 s')
    await expect(page.getByTestId('route-1')).toBeAttached()
    await expect(page.getByTestId('ghost-trail-1')).toBeAttached()
    await expect(page.getByTestId('failure-marker')).toContainText('Side Entrance closed')
    await expect(page.getByTestId('directions')).toContainText('Walk to the Garden Entrance. Level entrance, no steps.')
    await expect(page.getByTestId('directions')).toContainText('Walk through the garden vestibule to the lift door on Floor 1.')
    await evidence(page, 'desktop-floor-1-garden-entrance.png')
  })

  test('no suitable route: nothing to confirm, the ghost and the locks stay', async ({ page }) => {
    await open(page)
    await pickScenario(page, /Side Entrance closed/)
    await page.getByRole('button', { name: 'Close Side Entrance' }).click()
    await page.getByRole('button', { name: 'Close Garden Entrance' }).click()
    await expect(status(page)).toHaveText('No step-free route to Room 204. The Side Entrance is closed. The Garden Entrance is closed.')
    await expect(page.getByTestId('no-suitable-route')).toHaveText('No step-free alternative found.')
    await expect(page.getByTestId('proposal')).toContainText('Room 203 (Blue Room): no step-free route')
    await expect(page.getByTestId('proposal')).toContainText('Room 104 (Garden Hall): no step-free route')
    await expect(page.getByRole('button', { name: /Move event/ })).toHaveCount(0)
    await expect(page.getByTestId('other-profile')).toHaveText(
      'Steps allowed still reaches Room 204 via Main Entrance (front steps) → Grand Staircase.',
    )
    await expect(page.getByText('There is no step-free route to Room 204 right now.')).toBeVisible()
    await expect(page.getByTestId('route-1')).toHaveCount(0)
    await expect(page.getByTestId('ghost-trail-1')).toBeAttached()
    await expect(page.getByTestId('lock-garden-door')).toBeVisible()

    // Reopening one door leaves the state.
    await page.getByRole('button', { name: 'Close Garden Entrance' }).click()
    await expect(page.getByTestId('no-suitable-route')).toHaveCount(0)
    await expect(page.getByTestId('route-1')).toBeAttached()
  })

  test('keyboard: floor tabs with arrows, Home and End; steps with Enter; closures with Space', async ({ page }) => {
    await open(page)
    const lift = page.getByRole('button', { name: 'Lift out of service' })
    for (let i = 0; i < 15 && !(await lift.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(lift).toBeFocused()
    await page.keyboard.press('Space')
    await expect(lift).toHaveAttribute('aria-pressed', 'true')

    const floor1 = tab(page, 1)
    for (let i = 0; i < 15 && !(await floor1.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(floor1).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(tab(page, 2)).toBeFocused()
    await expect(tab(page, 2)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(tab(page, 3)).toBeFocused()
    await expect(tab(page, 3)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(floor1).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowLeft')
    await expect(tab(page, 3)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Showing Floor 3.')).toBeAttached()
    // Only the selected tab is in the Tab order.
    await expect(floor1).toHaveAttribute('tabindex', '-1')

    await page.getByRole('button', { name: 'Lift out of service' }).click()
    const step = page.getByRole('button', { name: 'Take the side ramp to the Side Entrance. No steps.' })
    for (let i = 0; i < 25 && !(await step.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(step).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(step).toHaveAttribute('aria-current', 'step')
    await expect(step).toBeFocused()
    await expect(tab(page, 1)).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('phone at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test.skip(({ isMobile }) => !isMobile, 'Phone layout checks')

  test('one column, a jump link to the map, no sideways scroll, the whole lift scenario', async ({ page }) => {
    await open(page)
    await noSidewaysScroll(page)
    const order = await Promise.all(
      [page.getByRole('group', { name: 'Scenario' }), page.getByRole('region', { name: 'Route status' }), page.getByRole('tablist'), page.getByRole('tabpanel'), page.getByRole('heading', { name: /Directions to/ })].map(
        async (el) => (await el.boundingBox())!.y,
      ),
    )
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    const tabs = await Promise.all([1, 2, 3].map(async (f) => (await tab(page, f).boundingBox())!))
    expect(new Set(tabs.map((t) => Math.round(t.y))).size).toBe(1)

    await page.getByRole('link', { name: 'Jump to the map' }).click()
    await expect(page.getByRole('tablist')).toBeInViewport()

    await page.getByRole('button', { name: 'Lift out of service' }).click()
    await expect(status(page)).toHaveText('No step-free route to Room 204. The lift is out of service.')
    await expect(page.getByTestId('ghost-trail-1')).toBeAttached()
    await noSidewaysScroll(page)
    await evidence(page, 'phone-390-1-lift-out.png', true)

    await page.getByRole('button', { name: 'Move event to Room 104' }).click()
    await expect(page.getByRole('heading', { name: 'Directions to Room 104' })).toBeFocused()
    await page.getByRole('button', { name: 'Walk to Room 104 (Garden Hall).' }).click()
    await expect(page.getByRole('tabpanel')).toBeInViewport()
    await noSidewaysScroll(page)
    await evidence(page, 'phone-390-2-moved-104.png', true)

    // Every other state, including both "no suitable route" states, fits the width too.
    const states: [RegExp, string[]][] = [
      [/Gallery door closed/, ['Close central door', 'Close Gallery Walk door', 'Lift out of service']],
      [/Side Entrance closed/, ['Close Side Entrance', 'Close Garden Entrance']],
    ]
    for (const [scenario, buttons] of states) {
      await pickScenario(page, scenario)
      for (const name of buttons) {
        await page.getByRole('button', { name }).click()
        await noSidewaysScroll(page)
      }
      await expect(page.getByTestId('no-suitable-route')).toHaveText('No step-free alternative found.')
    }
  })
})
