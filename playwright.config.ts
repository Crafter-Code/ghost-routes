import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`
// Locally use the installed Google Chrome; in CI run `npx playwright install chromium` and set PW_CHANNEL=chromium.
const channel = process.env.PW_CHANNEL ?? 'chrome'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL,
    channel,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1366, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], channel } },
  ],
  // Tests run against the production build served by `vite preview`, unless BASE_URL points elsewhere.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
})
