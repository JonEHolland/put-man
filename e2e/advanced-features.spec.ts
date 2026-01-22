import { test, expect } from './electron-fixture'

// Helper to get the URL input (uses the VariableHighlightInput structure)
const getUrlInput = (page: any) => page.locator('.bg-panel input[type="text"]').first()

// Helper to ensure a tab is open (app starts with no tabs)
const ensureTabOpen = async (page: any) => {
  const welcomeScreen = page.locator('text=No Request Open')
  if (await welcomeScreen.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.getByRole('button', { name: 'New HTTP Request' }).click()
    await page.waitForTimeout(500)
  }
}

test.describe('WebSocket', () => {
  test('should create WebSocket tab via context menu', async ({ page }) => {
    // Right-click on the new tab button to get context menu
    const newTabButton = page.locator('button[title="New Tab (right-click for options)"]')
    await newTabButton.click({ button: 'right' })

    // Click WebSocket option
    await page.locator('text=WebSocket').click()

    // Should see WebSocket tab with WS badge
    await expect(page.locator('text=WS')).toBeVisible()

    // Should see WebSocket panel with Connect button
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible()
  })

  test('should show WebSocket URL input', async ({ page }) => {
    // Create WebSocket tab
    const newTabButton = page.locator('button[title="New Tab (right-click for options)"]')
    await newTabButton.click({ button: 'right' })
    await page.locator('text=WebSocket').click()

    // Should have URL input for WebSocket
    await expect(page.locator('input[placeholder*="ws://"]').or(page.locator('input[placeholder*="wss://"]'))).toBeVisible()
  })

  test('should show Messages and Headers tabs in WebSocket panel', async ({ page }) => {
    // Create WebSocket tab
    const newTabButton = page.locator('button[title="New Tab (right-click for options)"]')
    await newTabButton.click({ button: 'right' })
    await page.locator('text=WebSocket').click()

    // Should have tabs for configuration
    await expect(page.getByRole('button', { name: 'Headers' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Auth' })).toBeVisible()
  })
})

test.describe('SSE (Server-Sent Events)', () => {
  test('should create SSE tab via context menu', async ({ page }) => {
    // Right-click on the new tab button
    const newTabButton = page.locator('button[title="New Tab (right-click for options)"]')
    await newTabButton.click({ button: 'right' })

    // Click SSE option
    await page.locator('text=SSE').click()

    // Should see SSE tab with SSE badge
    await expect(page.locator('.method-badge').filter({ hasText: 'SSE' })).toBeVisible()

    // Should see Connect button
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible()
  })

  test('should show SSE configuration tabs', async ({ page }) => {
    // Create SSE tab
    const newTabButton = page.locator('button[title="New Tab (right-click for options)"]')
    await newTabButton.click({ button: 'right' })
    await page.locator('text=SSE').click()

    // Should have Headers and Auth tabs
    await expect(page.getByRole('button', { name: 'Headers' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Auth' })).toBeVisible()
  })
})

test.describe('Pre-Request and Test Scripts', () => {
  test('should show scripts panel with pre-request and test script editors', async ({ page }) => {
    await ensureTabOpen(page)
    // Click on Scripts tab
    await page.getByRole('button', { name: 'Scripts' }).click()

    // Should see Pre-request Script section
    await expect(page.locator('text=Pre-request Script')).toBeVisible()

    // Should see Test Script section
    await expect(page.locator('text=Test Script')).toBeVisible()
  })

  test('should show variable reference in scripts panel', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Scripts' }).click()

    // Should see variable reference section
    await expect(page.locator('text=Available Variables')).toBeVisible()
    await expect(page.locator('text=pm.environment')).toBeVisible()
  })

  test('should run test script and show results', async ({ page }) => {
    await ensureTabOpen(page)
    // Enter URL
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')

    // Go to scripts tab and add a test
    await page.getByRole('button', { name: 'Scripts' }).click()

    // Find test script editor (second Monaco editor)
    await page.waitForTimeout(1000)
    const editors = page.locator('.monaco-editor textarea')
    const testScriptEditor = editors.nth(1)
    await testScriptEditor.focus()
    await testScriptEditor.fill('pm.test("Status is 200", function() { pm.response.to.have.status(200); });')

    // Send request
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Click on Tests tab in response panel
    await page.getByRole('button', { name: 'Tests' }).click()

    // Should show test results
    await expect(page.locator('text=Status is 200')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Authentication', () => {
  test('should configure Basic Auth', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Auth' }).click()

    // Select Basic Auth
    const authSelect = page.locator('select').filter({ hasText: 'No Auth' })
    await authSelect.selectOption('basic')

    // Should see username and password fields
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible()
  })

  test('should configure Bearer Token', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Auth' }).click()

    // Select Bearer Token
    const authSelect = page.locator('select').filter({ hasText: 'No Auth' })
    await authSelect.selectOption('bearer')

    // Should see token field
    await expect(page.locator('input[placeholder="Token"]')).toBeVisible()
  })

  test('should configure API Key auth', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Auth' }).click()

    // Select API Key
    const authSelect = page.locator('select').filter({ hasText: 'No Auth' })
    await authSelect.selectOption('api-key')

    // Should see key and value fields
    await expect(page.locator('input[placeholder="Header name"]').or(page.locator('input[placeholder="Key"]'))).toBeVisible()
    await expect(page.locator('input[placeholder="API Key"]').or(page.locator('input[placeholder="Value"]'))).toBeVisible()
  })

  test('should configure OAuth2', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Auth' }).click()

    // Select OAuth2
    const authSelect = page.locator('select').filter({ hasText: 'No Auth' })
    await authSelect.selectOption('oauth2')

    // Should see OAuth2 configuration fields
    await expect(page.locator('input[placeholder="Client ID"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Token URL"]')).toBeVisible()
  })

  test('should send request with Basic Auth', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/basic-auth/user/pass')

    // Configure Basic Auth
    await page.getByRole('button', { name: 'Auth' }).click()
    const authSelect = page.locator('select').filter({ hasText: 'No Auth' })
    await authSelect.selectOption('basic')

    await page.locator('input[placeholder="Username"]').fill('user')
    await page.locator('input[placeholder="Password"]').fill('pass')

    // Send request
    await page.getByRole('button', { name: 'Send' }).click()

    // Should get 200 with correct auth
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text="authenticated"')).toBeVisible()
  })
})

test.describe('Headers', () => {
  test('should add custom header', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Headers' }).click()

    // Find the key-value editor for headers
    const keyInput = page.locator('input[placeholder="Header name"]').or(page.locator('input[placeholder="Key"]')).last()
    await keyInput.fill('X-Custom-Header')

    const valueInput = page.locator('input[placeholder="Header value"]').or(page.locator('input[placeholder="Value"]')).last()
    await valueInput.fill('custom-value')

    // Send request and verify header was sent
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/headers')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response and check if custom header appears
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text=X-Custom-Header')).toBeVisible()
  })

  test('should disable header with checkbox', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Headers' }).click()

    // Add a header first
    const keyInput = page.locator('input[placeholder="Header name"]').or(page.locator('input[placeholder="Key"]')).last()
    await keyInput.fill('X-Test-Header')

    const valueInput = page.locator('input[placeholder="Header value"]').or(page.locator('input[placeholder="Value"]')).last()
    await valueInput.fill('test-value')

    // Find and uncheck the checkbox for this header
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.last().uncheck()

    // Verify checkbox is unchecked
    await expect(checkboxes.last()).not.toBeChecked()
  })
})

test.describe('Query Parameters', () => {
  test('should add query parameter', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Params' }).click()

    // Add parameter
    const keyInput = page.locator('input[placeholder="Parameter name"]').or(page.locator('input[placeholder="Key"]')).last()
    await keyInput.fill('search')

    const valueInput = page.locator('input[placeholder="Parameter value"]').or(page.locator('input[placeholder="Value"]')).last()
    await valueInput.fill('test')

    // URL should update with query string
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response and verify parameter was sent
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text="search"')).toBeVisible()
  })
})

test.describe('Request Body Types', () => {
  test('should send form data', async ({ page }) => {
    await ensureTabOpen(page)
    // Set method to POST
    await page.locator('select.font-semibold').selectOption('POST')

    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/post')

    // Go to body tab
    await page.getByRole('button', { name: 'Body' }).click()

    // Select Form Data
    await page.locator('label').filter({ hasText: 'Form Data' }).click()

    // Add form field
    const keyInput = page.locator('input[placeholder="Key"]').last()
    await keyInput.fill('username')

    const valueInput = page.locator('input[placeholder="Value"]').last()
    await valueInput.fill('testuser')

    // Send request
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text="username"')).toBeVisible()
  })

  test('should send x-www-form-urlencoded', async ({ page }) => {
    await ensureTabOpen(page)
    await page.locator('select.font-semibold').selectOption('POST')

    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/post')

    await page.getByRole('button', { name: 'Body' }).click()
    await page.locator('label').filter({ hasText: 'x-www-form-urlencoded' }).click()

    // Add field
    const keyInput = page.locator('input[placeholder="Key"]').last()
    await keyInput.fill('email')

    const valueInput = page.locator('input[placeholder="Value"]').last()
    await valueInput.fill('test@example.com')

    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
  })

  test('should send raw body', async ({ page }) => {
    await ensureTabOpen(page)
    await page.locator('select.font-semibold').selectOption('POST')

    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/post')

    await page.getByRole('button', { name: 'Body' }).click()
    await page.locator('label').filter({ hasText: /^Raw$/ }).click()

    // Wait for editor and type raw content
    await page.waitForTimeout(1000)
    const editor = page.locator('.monaco-editor textarea')
    await editor.focus()
    await editor.fill('raw text content')

    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
  })
})

test.describe('Keyboard Shortcuts', () => {
  test('should send request with Cmd+Enter', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')

    // Press Cmd+Enter (or Ctrl+Enter on other platforms)
    await page.keyboard.press('Meta+Enter')

    // Should start loading
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({ timeout: 5000 })
  })

  test('should create new tab with Cmd+T', async ({ page }) => {
    const initialTabs = await page.locator('[draggable="true"]').count()

    await page.keyboard.press('Meta+t')

    const newTabs = await page.locator('[draggable="true"]').count()
    expect(newTabs).toBe(initialTabs + 1)
  })

  test('should close tab with Cmd+W', async ({ page }) => {
    // Create extra tabs first
    await page.keyboard.press('Meta+t')
    await page.keyboard.press('Meta+t')

    const tabsAfterCreate = await page.locator('[draggable="true"]').count()

    await page.keyboard.press('Meta+w')

    const tabsAfterClose = await page.locator('[draggable="true"]').count()
    expect(tabsAfterClose).toBe(tabsAfterCreate - 1)
  })
})

test.describe('Environment Variables', () => {
  test('should use environment variable in URL', async ({ page }) => {
    await ensureTabOpen(page)
    // Create environment with variable
    await page.locator('button[title="Manage Environments"]').click()

    const newEnvInput = page.locator('input[placeholder="New environment name"]')
    await newEnvInput.fill('Variables Test')
    await page.keyboard.press('Enter')

    // Select the environment
    await page.locator('button').filter({ hasText: 'Variables Test' }).click()

    // Add variable
    const keyInput = page.locator('input[placeholder="Key"]').last()
    await keyInput.fill('BASE_URL')

    const valueInput = page.locator('input[placeholder="Value"]').last()
    await valueInput.fill('https://httpbin.org')

    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.keyboard.press('Escape')

    // Select the environment
    const envSelect = page.locator('select').filter({ hasText: 'No Environment' })
    await envSelect.selectOption({ label: 'Variables Test' })

    // Use variable in URL
    const urlInput = getUrlInput(page)
    await urlInput.fill('{{BASE_URL}}/get')

    // Send request
    await page.getByRole('button', { name: 'Send' }).click()

    // Should successfully resolve variable and get response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
  })
})

test.describe('Import/Export', () => {
  test('should show import button in collections', async ({ page }) => {
    // Should see Import button in collections section
    await expect(page.locator('button').filter({ hasText: 'Import' })).toBeVisible()
  })

  test('should export collection via context menu', async ({ page }) => {
    // Create a collection first
    await page.locator('button').filter({ hasText: 'Add' }).click()
    const collectionInput = page.locator('input[placeholder="Collection name"]')
    await collectionInput.fill('Export Test')
    await page.getByRole('button', { name: 'Create' }).click()

    // Right-click on the collection
    await page.locator('button').filter({ hasText: 'Export Test' }).click({ button: 'right' })

    // Should see export options
    await expect(page.locator('text=Export as Postman')).toBeVisible()
    await expect(page.locator('text=Export as JSON')).toBeVisible()
  })
})
