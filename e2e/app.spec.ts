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

test.describe('App Launch', () => {
  test('should launch and show main window', async ({ page }) => {
    // Verify the app title bar shows Put-Man
    await expect(page.locator('text=Put-Man')).toBeVisible()
  })

  test('should have sidebar with collections and history tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Collections' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible()
  })

  test('should have New Request button in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New Request' })).toBeVisible()
  })

  test('should have environment selector', async ({ page }) => {
    await expect(page.locator('text=Env:')).toBeVisible()
    await expect(page.locator('select').filter({ hasText: 'No Environment' })).toBeVisible()
  })

  test('should show welcome screen when no tabs open', async ({ page }) => {
    // Should see the welcome screen with options to create new request
    await expect(page.locator('text=No Request Open')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New HTTP Request' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New WebSocket' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New SSE' })).toBeVisible()
  })
})

test.describe('Tab Management', () => {
  test('should create new tab when clicking New Request', async ({ page }) => {
    const initialTabs = await page.locator('[draggable="true"]').count()
    await page.getByRole('button', { name: 'New Request' }).click()
    const newTabs = await page.locator('[draggable="true"]').count()
    expect(newTabs).toBe(initialTabs + 1)
  })

  test('should close tab when clicking close button', async ({ page }) => {
    // Create a new tab first
    await page.getByRole('button', { name: 'New Request' }).click()
    const tabsAfterCreate = await page.locator('[draggable="true"]').count()

    // Find and click the close button on the last tab
    const closeButtons = page.locator('[draggable="true"] button')
    await closeButtons.last().click()

    const tabsAfterClose = await page.locator('[draggable="true"]').count()
    expect(tabsAfterClose).toBe(tabsAfterCreate - 1)
  })

  test('should switch tabs when clicking on them', async ({ page }) => {
    // Create a first tab
    await page.getByRole('button', { name: 'New Request' }).click()
    await page.waitForTimeout(500)

    // Type URL in this tab
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://example.com/first')

    // Create a second tab
    await page.getByRole('button', { name: 'New Request' }).click()
    await page.waitForTimeout(500)

    // Type different URL in second tab
    await urlInput.fill('https://example.com/second')

    // Click on the first tab
    const tabs = page.locator('[draggable="true"]')
    await tabs.first().click()
    await page.waitForTimeout(300)

    // Should show the first URL we entered
    await expect(urlInput).toHaveValue('https://example.com/first')
  })
})

test.describe('HTTP Request Builder', () => {
  test('should change HTTP method', async ({ page }) => {
    await ensureTabOpen(page)
    // The method selector has class font-semibold and contains GET, POST, etc.
    const methodSelect = page.locator('select.font-semibold')
    await methodSelect.selectOption('POST')
    await expect(methodSelect).toHaveValue('POST')
  })

  test('should enter URL in the URL bar', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await expect(urlInput).toHaveValue('https://httpbin.org/get')
  })

  test('should have request panel tabs', async ({ page }) => {
    await ensureTabOpen(page)
    // Check for request panel tabs
    await expect(page.getByRole('button', { name: 'Params' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Headers' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Body' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Auth' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Scripts' })).toBeVisible()
  })

  test('should switch to body tab and show body type options', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Body' }).click()

    // Check for body type radio buttons
    await expect(page.locator('text=None')).toBeVisible()
    await expect(page.locator('text=JSON')).toBeVisible()
    await expect(page.locator('text=Form Data')).toBeVisible()
  })

  test('should show auth options when clicking Auth tab', async ({ page }) => {
    await ensureTabOpen(page)
    await page.getByRole('button', { name: 'Auth' }).click()

    // Check for auth type selector
    const authSelect = page.locator('select').filter({ hasText: 'No Auth' })
    await expect(authSelect).toBeVisible()
  })
})

test.describe('Send Request', () => {
  test('should send GET request and display response', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')

    // Click send button
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response - look for status code
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Should show response body
    await expect(page.locator('text="url"')).toBeVisible({ timeout: 5000 })
  })

  test('should send POST request with JSON body', async ({ page }) => {
    await ensureTabOpen(page)
    // Set method to POST
    await page.locator('select.font-semibold').selectOption('POST')

    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/post')

    // Go to body tab
    await page.getByRole('button', { name: 'Body' }).click()

    // Select JSON body type
    await page.locator('label').filter({ hasText: 'JSON' }).click()

    // Wait for Monaco editor to load and type JSON
    await page.waitForTimeout(1000)
    const editor = page.locator('.monaco-editor textarea')
    await editor.focus()
    await editor.fill('{"test": "value"}')

    // Send request
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })
  })

  test('should cancel request when clicking Cancel', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    // Use a slow endpoint
    await urlInput.fill('https://httpbin.org/delay/10')

    // Click send button
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for Cancel button to appear
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Send button should reappear
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
  })
})

test.describe('Collections', () => {
  test('should create a new collection', async ({ page }) => {
    // Click Add button in collections
    await page.locator('button').filter({ hasText: 'Add' }).click()

    // Enter collection name
    const collectionInput = page.locator('input[placeholder="Collection name"]')
    await collectionInput.fill('Test Collection')
    await page.getByRole('button', { name: 'Create' }).click()

    // Collection should appear in sidebar
    await expect(page.locator('text=Test Collection')).toBeVisible()
  })

  test('should expand collection and show Add Folder button', async ({ page }) => {
    // First create a collection if none exists
    await page.locator('button').filter({ hasText: 'Add' }).click()
    const collectionInput = page.locator('input[placeholder="Collection name"]')
    await collectionInput.fill('My Collection')
    await page.getByRole('button', { name: 'Create' }).click()

    // Click on collection to expand it
    await page.locator('button').filter({ hasText: 'My Collection' }).click()

    // Should see Add Folder button
    await expect(page.locator('text=Add Folder')).toBeVisible()
  })

  test('should save request to collection', async ({ page }) => {
    await ensureTabOpen(page)
    // Create a collection first
    await page.locator('button').filter({ hasText: 'Add' }).click()
    const collectionInput = page.locator('input[placeholder="Collection name"]')
    await collectionInput.fill('API Tests')
    await page.getByRole('button', { name: 'Create' }).click()

    // Enter a URL
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://api.example.com/users')

    // Click save button (the one next to Send)
    await page.locator('button[title="Save to Collection"]').click()

    // Modal should appear - select the collection
    await expect(page.locator('text=Save to Collection').first()).toBeVisible()

    // Enter request name
    const requestNameInput = page.locator('input[placeholder="Request name"]')
    await requestNameInput.fill('Get Users')

    // Select collection
    await page.locator('select').filter({ hasText: 'Select a collection' }).selectOption({ index: 1 })

    // Click save
    await page.getByRole('button', { name: 'Save' }).click()

    // Expand collection and verify request is there
    await page.locator('button').filter({ hasText: 'API Tests' }).click()
    await expect(page.locator('text=Get Users')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('History', () => {
  test('should switch to history tab', async ({ page }) => {
    await page.getByRole('button', { name: 'History' }).click()

    // Should see history section (either "No history yet" or history entries)
    const historySection = page.locator('.overflow-y-auto')
    await expect(historySection).toBeVisible()
  })

  test('should record request in history after sending', async ({ page }) => {
    await ensureTabOpen(page)
    // Send a request first
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Switch to history
    await page.getByRole('button', { name: 'History' }).click()

    // Should see the request in history
    await expect(page.locator('text=httpbin.org/get')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Environments', () => {
  test('should open environment manager', async ({ page }) => {
    // Click the gear icon next to environment selector
    await page.locator('button[title="Manage Environments"]').click()

    // Environment manager modal should appear
    await expect(page.locator('text=Environment Manager')).toBeVisible()
  })

  test('should create new environment', async ({ page }) => {
    // Open environment manager
    await page.locator('button[title="Manage Environments"]').click()

    // Click to create new environment
    const newEnvInput = page.locator('input[placeholder="New environment name"]')
    await newEnvInput.fill('Development')
    await page.keyboard.press('Enter')

    // Environment should appear in list
    await expect(page.locator('text=Development')).toBeVisible()
  })

  test('should add variable to environment', async ({ page }) => {
    // Open environment manager
    await page.locator('button[title="Manage Environments"]').click()

    // Create environment first
    const newEnvInput = page.locator('input[placeholder="New environment name"]')
    await newEnvInput.fill('Test Env')
    await page.keyboard.press('Enter')

    // Click on the environment to select it
    await page.locator('button').filter({ hasText: 'Test Env' }).click()

    // Add a variable - find the key input in the variables section
    const keyInput = page.locator('input[placeholder="Key"]').last()
    await keyInput.fill('API_URL')

    const valueInput = page.locator('input[placeholder="Value"]').last()
    await valueInput.fill('https://api.test.com')

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()

    // Close modal
    await page.keyboard.press('Escape')

    // Verify environment can be selected
    const envSelect = page.locator('select').filter({ hasText: 'No Environment' })
    await envSelect.selectOption({ label: 'Test Env' })
    await expect(envSelect).toHaveValue(/Test Env/)
  })
})

test.describe('Response Panel', () => {
  test('should display response headers', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Click on Headers tab in response panel
    await page.locator('button').filter({ hasText: 'Headers' }).nth(1).click()

    // Should see response headers
    await expect(page.locator('text=content-type')).toBeVisible({ timeout: 5000 })
  })

  test('should switch between Pretty and Raw view', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Should see view mode buttons in the Body tab
    await expect(page.getByRole('button', { name: 'Pretty' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Raw' })).toBeVisible()

    // Click Raw to switch view
    await page.getByRole('button', { name: 'Raw' }).click()

    // Should still show response content
    await expect(page.locator('text="url"')).toBeVisible()
  })

  test('should show response time and size', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Should show time (ms)
    await expect(page.locator('text=/\\d+\\s*ms/')).toBeVisible()

    // Should show size
    await expect(page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB)/')).toBeVisible()
  })
})

test.describe('Code Generation', () => {
  test('should generate cURL code', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Click on Code tab in response panel
    await page.getByRole('button', { name: 'Code' }).click()

    // Should show generated code
    await expect(page.locator('text=curl')).toBeVisible({ timeout: 5000 })
  })

  test('should switch between code languages', async ({ page }) => {
    await ensureTabOpen(page)
    const urlInput = getUrlInput(page)
    await urlInput.fill('https://httpbin.org/get')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.locator('text=200 OK').first()).toBeVisible({ timeout: 30000 })

    // Click on Code tab
    await page.getByRole('button', { name: 'Code' }).click()

    // Find language selector and change to JavaScript Fetch
    const langSelect = page.locator('select').filter({ hasText: 'cURL' })
    await langSelect.selectOption('js-fetch')

    // Should show fetch code
    await expect(page.locator('text=fetch')).toBeVisible({ timeout: 5000 })
  })
})
