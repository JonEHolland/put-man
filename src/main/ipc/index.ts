import { ipcMain, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import {
  collectionsRepo,
  foldersRepo,
  requestsRepo,
  environmentsRepo,
  historyRepo
} from '../database/repositories'
import { httpService } from '../services/http'
import type { Collection, Folder, Request, Environment, Response } from '../../shared/types/models'

export function registerIpcHandlers(): void {
  // Collections
  ipcMain.handle('db:getCollections', async () => {
    return collectionsRepo.getAll()
  })

  ipcMain.handle('db:createCollection', async (_, name: string, description?: string) => {
    return collectionsRepo.create(name, description)
  })

  ipcMain.handle('db:updateCollection', async (_, id: string, updates: Partial<Collection>) => {
    return collectionsRepo.update(id, updates)
  })

  ipcMain.handle('db:deleteCollection', async (_, id: string) => {
    collectionsRepo.delete(id)
  })

  // Folders
  ipcMain.handle('db:getFolders', async (_, collectionId: string) => {
    return foldersRepo.getByCollection(collectionId)
  })

  ipcMain.handle(
    'db:createFolder',
    async (_, collectionId: string, name: string, parentId?: string) => {
      return foldersRepo.create(collectionId, name, parentId)
    }
  )

  ipcMain.handle('db:updateFolder', async (_, id: string, updates: Partial<Folder>) => {
    return foldersRepo.update(id, updates)
  })

  ipcMain.handle('db:deleteFolder', async (_, id: string) => {
    foldersRepo.delete(id)
  })

  // Requests
  ipcMain.handle('db:getCollectionRequests', async (_, collectionId: string) => {
    return requestsRepo.getByCollection(collectionId)
  })

  ipcMain.handle(
    'db:saveRequest',
    async (_, collectionId: string, request: Request, folderId?: string) => {
      return requestsRepo.save(collectionId, request, folderId)
    }
  )

  ipcMain.handle('db:updateRequest', async (_, id: string, request: Request) => {
    return requestsRepo.update(id, request)
  })

  ipcMain.handle('db:deleteRequest', async (_, id: string) => {
    requestsRepo.delete(id)
  })

  // Environments
  ipcMain.handle('db:getEnvironments', async () => {
    return environmentsRepo.getAll()
  })

  ipcMain.handle('db:createEnvironment', async (_, name: string) => {
    return environmentsRepo.create(name)
  })

  ipcMain.handle('db:updateEnvironment', async (_, id: string, updates: Partial<Environment>) => {
    return environmentsRepo.update(id, updates)
  })

  ipcMain.handle('db:deleteEnvironment', async (_, id: string) => {
    environmentsRepo.delete(id)
  })

  ipcMain.handle('db:setActiveEnvironment', async (_, id: string | null) => {
    environmentsRepo.setActive(id)
  })

  // History
  ipcMain.handle('db:getHistory', async (_, limit?: number) => {
    return historyRepo.getAll(limit)
  })

  ipcMain.handle('db:addToHistory', async (_, request: Request, response?: Response) => {
    return historyRepo.add(request, response)
  })

  ipcMain.handle('db:clearHistory', async () => {
    historyRepo.clear()
  })

  // HTTP
  ipcMain.handle('http:send', async (_, request: Request, environment?: Environment) => {
    return httpService.send(request, environment)
  })

  ipcMain.handle('http:cancel', async (_, requestId: string) => {
    httpService.cancel(requestId)
  })

  // File operations
  ipcMain.handle(
    'file:open',
    async (_, filters?: { name: string; extensions: string[] }[]) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const filePath = result.filePaths[0]
      const content = await readFile(filePath, 'utf-8')
      return { path: filePath, content }
    }
  )

  ipcMain.handle('file:save', async (_, content: string, defaultPath?: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    await writeFile(result.filePath, content, 'utf-8')
    return result.filePath
  })
}
