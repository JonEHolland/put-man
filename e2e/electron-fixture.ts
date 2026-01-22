import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ElectronFixtures = {
  electronApp: ElectronApplication
  page: Page
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    // Electron args for background/headless-like running
    const args = [path.join(__dirname, '../out/main/index.js')]

    // Add flags to reduce visual interference
    // --disable-gpu helps with running in background
    // --force-device-scale-factor ensures consistent rendering
    if (process.env.CI || process.env.HEADLESS) {
      args.push('--disable-gpu')
      args.push('--disable-software-rasterizer')
    }

    const electronApp = await electron.launch({
      args,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Signal to the app that we're in E2E test mode
        E2E_TEST: '1'
      }
    })

    await use(electronApp)
    await electronApp.close()
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()

    // Move window off-screen to prevent focus stealing (macOS)
    if (process.env.CI || process.env.HEADLESS) {
      await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          // Position window off-screen
          win.setPosition(-2000, -2000)
          // Prevent window from showing
          win.hide()
        }
      })
    }

    await page.waitForLoadState('domcontentloaded')
    // Wait for app to be ready (collections loaded)
    await page.waitForTimeout(1000)
    await use(page)
  }
})

export { expect } from '@playwright/test'
