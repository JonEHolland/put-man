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
import { graphqlService } from '../services/graphql'
import { grpcService } from '../services/grpc'
import { importExportService } from '../services/importExport'
import { codeGenerationService, type CodeLanguage } from '../services/codeGeneration'
import { oauth2Service } from '../services/oauth2'
import { websocketService } from '../services/websocket'
import { sseService } from '../services/sse'
import type { Collection, Folder, Request, HttpRequest, GraphQLRequest, GrpcRequest, WebSocketRequest, SSERequest, Environment, Response, OAuth2Config, KeyValuePair } from '../../shared/types/models'

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

  ipcMain.handle('db:moveRequest', async (_, id: string, targetFolderId: string | null) => {
    return requestsRepo.move(id, targetFolderId)
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

  // GraphQL
  ipcMain.handle('graphql:send', async (_, request: GraphQLRequest, environment?: Environment) => {
    return graphqlService.send(request, environment)
  })

  ipcMain.handle('graphql:introspect', async (_, url: string, headers?: KeyValuePair[], environment?: Environment) => {
    return graphqlService.introspect(url, headers, environment)
  })

  ipcMain.handle('graphql:cancel', async (_, requestId: string) => {
    graphqlService.cancel(requestId)
  })

  // gRPC
  ipcMain.handle('grpc:send', async (_, request: GrpcRequest, environment?: Environment) => {
    return grpcService.send(request, environment)
  })

  ipcMain.handle('grpc:loadProto', async (_, filePath: string) => {
    return grpcService.loadProto(filePath)
  })

  ipcMain.handle('grpc:reflect', async (_, url: string) => {
    return grpcService.reflect(url)
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

  // Import/Export
  ipcMain.handle('import:postmanCollection', async (_, filePath: string) => {
    const content = await readFile(filePath, 'utf-8')
    return importExportService.importPostmanCollection(content)
  })

  ipcMain.handle('export:collection', async (_, collectionId: string, format: 'native' | 'postman') => {
    return importExportService.exportCollection(collectionId, format)
  })

  // Code Generation
  ipcMain.handle('codeGen:generate', async (_, language: CodeLanguage, request: HttpRequest, includeComments?: boolean) => {
    return codeGenerationService.generateCode(language, { request, includeComments })
  })

  ipcMain.handle('codeGen:getSupportedLanguages', async () => {
    return codeGenerationService.supportedLanguages
  })

  // OAuth2
  ipcMain.handle('oauth2:authCodeFlow', async (_, config: OAuth2Config, environment?: Environment) => {
    return oauth2Service.startAuthCodeFlow(config, environment)
  })

  ipcMain.handle('oauth2:clientCredentials', async (_, config: OAuth2Config, environment?: Environment) => {
    return oauth2Service.clientCredentialsFlow(config, environment)
  })

  ipcMain.handle('oauth2:refreshToken', async (_, config: OAuth2Config, environment?: Environment) => {
    return oauth2Service.refreshToken(config, environment)
  })

  // WebSocket
  ipcMain.handle('websocket:connect', async (_, connectionId: string, request: WebSocketRequest, environment?: Environment) => {
    return websocketService.connect(connectionId, request, environment)
  })

  ipcMain.handle('websocket:disconnect', async (_, connectionId: string) => {
    return websocketService.disconnect(connectionId)
  })

  ipcMain.handle('websocket:send', async (_, connectionId: string, message: string) => {
    return websocketService.send(connectionId, message)
  })

  // SSE
  ipcMain.handle('sse:connect', async (_, connectionId: string, request: SSERequest, environment?: Environment) => {
    return sseService.connect(connectionId, request, environment)
  })

  ipcMain.handle('sse:disconnect', async (_, connectionId: string) => {
    return sseService.disconnect(connectionId)
  })
}
