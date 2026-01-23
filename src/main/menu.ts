import { Menu, shell, BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { is } from '@electron-toolkit/utils'

export function createMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: 'Put-Man',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Request',
          accelerator: 'CmdOrCtrl+T',
          click: (): void => {
            mainWindow.webContents.send('menu:new-request')
          }
        },
        {
          label: 'New Collection',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: (): void => {
            mainWindow.webContents.send('menu:new-collection')
          }
        },
        { type: 'separator' },
        {
          label: 'Import...',
          accelerator: 'CmdOrCtrl+I',
          click: (): void => {
            mainWindow.webContents.send('menu:import')
          }
        },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+E',
          click: (): void => {
            mainWindow.webContents.send('menu:export')
          }
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: (): void => {
            mainWindow.webContents.send('menu:close-tab')
          }
        },
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const }])
      ]
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }]
              }
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }])
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(is.dev ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async (): Promise<void> => {
            await shell.openExternal('https://github.com/put-man/put-man')
          }
        },
        {
          label: 'Report an Issue',
          click: async (): Promise<void> => {
            await shell.openExternal('https://github.com/put-man/put-man/issues')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
