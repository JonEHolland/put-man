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

    // Create a collection first
    const addBtn = page.locator('button:has-text("Add")').first()
    await addBtn.click()
    await page.waitForTimeout(300)

    // Fill collection name
    const collectionInput = page.locator('input[placeholder="Collection name"]')
    await collectionInput.fill('My API')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Click the New Request dropdown button
    const newRequestBtn = page.locator('button:has-text("New Request")').first()
    await newRequestBtn.click()
    await page.waitForTimeout(500)

    // Click HTTP Request option in the dropdown
    const httpOption = page.locator('button:has-text("HTTP Request")').first()
    await httpOption.click()
    await page.waitForTimeout(1000)

    // Find the URL input and fill it
    const urlInput = page.locator('input[type="text"]').first()
    await urlInput.waitFor({ state: 'visible', timeout: 5000 })
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/1')
    await page.waitForTimeout(300)

    // Click Params tab and add a parameter
    await page.click('button:has-text("Params")')
    await page.waitForTimeout(300)

    // Find and fill parameter key/value inputs
    const paramKeyInput = page.locator('input[placeholder="Key"]').first()
    const paramValueInput = page.locator('input[placeholder="Value"]').first()
    if (await paramKeyInput.isVisible()) {
      await paramKeyInput.fill('userId')
      await paramValueInput.fill('1')
    }
    await page.waitForTimeout(300)

    // Click Headers tab and add a header
    await page.click('button:has-text("Headers")')
    await page.waitForTimeout(300)

    const headerKeyInput = page.locator('input[placeholder="Key"]').first()
    const headerValueInput = page.locator('input[placeholder="Value"]').first()
    if (await headerKeyInput.isVisible()) {
      await headerKeyInput.fill('Accept')
      await headerValueInput.fill('application/json')
    }
    await page.waitForTimeout(300)

    // Send the request
    await page.click('button:has-text("Send")')

    // Wait for response
    await page.waitForTimeout(3000)

    // Check if response panel shows status
    const responseStatus = page.locator('text=/200|OK/')
    await responseStatus.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

    // Click on Headers tab to show we're on Params, then back to see response
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
