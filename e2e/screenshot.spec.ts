import { test, expect } from './electron-fixture'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Promotional Screenshot', () => {
  test('capture app screenshot for README', async ({ electronApp, page }) => {
    // Make window visible and properly sized for screenshot
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.setPosition(100, 100)
        win.setSize(1400, 900)
        win.show()
        win.focus()
      }
    })

    // Wait for app to be fully ready
    await page.waitForTimeout(2000)

    // Click the New Request dropdown button
    const newRequestBtn = page.locator('button:has-text("New Request")').first()
    await newRequestBtn.click()
    await page.waitForTimeout(500)

    // Click HTTP Request option in the dropdown
    const httpOption = page.locator('button:has-text("HTTP Request")').first()
    await httpOption.click()
    await page.waitForTimeout(1000)

    // Now we should have a tab with URL input
    // Look for the URL input with the actual placeholder
    const urlInput = page.locator('input[type="text"]').filter({ hasText: '' }).first()
    await urlInput.waitFor({ state: 'visible', timeout: 5000 })

    // Fill in a sample URL
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts')
    await page.waitForTimeout(500)

    // Take the screenshot
    const screenshotPath = path.join(__dirname, '../docs/screenshot.png')
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    })

    console.log(`Screenshot saved to: ${screenshotPath}`)
  })
})
