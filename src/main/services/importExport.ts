import { v4 as uuidv4 } from 'uuid'
import {
  collectionsRepo,
  foldersRepo,
  requestsRepo
} from '../database/repositories'
import type {
  Collection,
  Folder,
  CollectionRequest,
  HttpRequest,
  HttpMethod,
  KeyValuePair,
  BodyType,
  RequestBody
} from '../../shared/types/models'

// Postman Collection v2.1 types
interface PostmanCollection {
  info: {
    name: string
    description?: string
    schema: string
  }
  item: PostmanItem[]
  variable?: PostmanVariable[]
}

interface PostmanItem {
  name: string
  request?: PostmanRequest
  item?: PostmanItem[]
}

interface PostmanRequest {
  method: string
  url: string | PostmanUrl
  header?: PostmanHeader[]
  body?: PostmanBody
  description?: string
}

interface PostmanUrl {
  raw: string
  protocol?: string
  host?: string[]
  path?: string[]
  query?: PostmanQueryParam[]
}

interface PostmanHeader {
  key: string
  value: string
  disabled?: boolean
}

interface PostmanQueryParam {
  key: string
  value: string
  disabled?: boolean
}

interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'file'
  raw?: string
  formdata?: PostmanFormDataParam[]
  urlencoded?: PostmanFormDataParam[]
  options?: {
    raw?: {
      language?: string
    }
  }
}

interface PostmanFormDataParam {
  key: string
  value: string
  disabled?: boolean
  type?: string
}

interface PostmanVariable {
  key: string
  value: string
}

export const importExportService = {
  async importPostmanCollection(jsonContent: string): Promise<Collection> {
    const postmanCollection: PostmanCollection = JSON.parse(jsonContent)

    // Create the collection
    const collection = collectionsRepo.create(
      postmanCollection.info.name,
      postmanCollection.info.description
    )

    // Process items recursively
    const processItems = (items: PostmanItem[], parentFolderId?: string) => {
      for (const item of items) {
        if (item.item && item.item.length > 0) {
          // This is a folder
          const folder = foldersRepo.create(collection.id, item.name, parentFolderId)
          processItems(item.item, folder.id)
        } else if (item.request) {
          // This is a request
          const request = convertPostmanRequest(item)
          requestsRepo.save(collection.id, request, parentFolderId)
        }
      }
    }

    processItems(postmanCollection.item)

    return collection
  },

  async exportCollection(collectionId: string, format: 'native' | 'postman'): Promise<string> {
    const collections = collectionsRepo.getAll()
    const collection = collections.find((c) => c.id === collectionId)
    if (!collection) throw new Error('Collection not found')

    const folders = foldersRepo.getByCollection(collectionId)
    const requests = requestsRepo.getByCollection(collectionId)

    if (format === 'native') {
      return JSON.stringify({ collection, folders, requests }, null, 2)
    }

    // Export as Postman Collection v2.1
    const postmanCollection: PostmanCollection = {
      info: {
        name: collection.name,
        description: collection.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: buildPostmanItems(folders, requests)
    }

    return JSON.stringify(postmanCollection, null, 2)
  }
}

function convertPostmanRequest(item: PostmanItem): HttpRequest {
  const req = item.request!
  const now = new Date().toISOString()

  // Parse URL
  let url = ''
  let queryParams: KeyValuePair[] = []

  if (typeof req.url === 'string') {
    url = req.url
  } else if (req.url) {
    url = req.url.raw || ''
    if (req.url.query) {
      queryParams = req.url.query.map((q) => ({
        id: uuidv4(),
        key: q.key,
        value: q.value,
        enabled: !q.disabled
      }))
    }
  }

  // Parse headers
  const headers: KeyValuePair[] = (req.header || []).map((h) => ({
    id: uuidv4(),
    key: h.key,
    value: h.value,
    enabled: !h.disabled
  }))

  // Parse body
  const body = convertPostmanBody(req.body)

  // Map method
  const method = (req.method?.toUpperCase() || 'GET') as HttpMethod

  return {
    id: uuidv4(),
    name: item.name,
    type: 'http',
    method,
    url,
    params: queryParams,
    headers,
    body,
    auth: { type: 'none' },
    createdAt: now,
    updatedAt: now
  }
}

function convertPostmanBody(postmanBody?: PostmanBody): RequestBody {
  if (!postmanBody) {
    return { type: 'none', content: '' }
  }

  let bodyType: BodyType = 'none'
  let content = ''
  let formData: KeyValuePair[] | undefined

  switch (postmanBody.mode) {
    case 'raw':
      content = postmanBody.raw || ''
      // Check if it's JSON
      if (postmanBody.options?.raw?.language === 'json' || isJson(content)) {
        bodyType = 'json'
      } else {
        bodyType = 'raw'
      }
      break
    case 'formdata':
      bodyType = 'form-data'
      formData = (postmanBody.formdata || []).map((f) => ({
        id: uuidv4(),
        key: f.key,
        value: f.value,
        enabled: !f.disabled
      }))
      break
    case 'urlencoded':
      bodyType = 'x-www-form-urlencoded'
      formData = (postmanBody.urlencoded || []).map((f) => ({
        id: uuidv4(),
        key: f.key,
        value: f.value,
        enabled: !f.disabled
      }))
      break
    default:
      bodyType = 'none'
  }

  return { type: bodyType, content, formData }
}

function isJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

function buildPostmanItems(
  folders: Folder[],
  requests: CollectionRequest[],
  parentFolderId?: string
): PostmanItem[] {
  const items: PostmanItem[] = []

  // Get root-level folders
  const childFolders = folders.filter((f) =>
    parentFolderId ? f.parentId === parentFolderId : !f.parentId
  )

  // Add folders
  for (const folder of childFolders) {
    items.push({
      name: folder.name,
      item: buildPostmanItems(folders, requests, folder.id)
    })
  }

  // Get requests at this level
  const childRequests = requests.filter((r) =>
    parentFolderId ? r.folderId === parentFolderId : !r.folderId
  )

  // Add requests
  for (const req of childRequests) {
    if (req.request.type === 'http') {
      const httpReq = req.request as HttpRequest
      items.push({
        name: httpReq.name,
        request: {
          method: httpReq.method,
          url: {
            raw: httpReq.url,
            query: httpReq.params.map((p) => ({
              key: p.key,
              value: p.value,
              disabled: !p.enabled
            }))
          },
          header: httpReq.headers.map((h) => ({
            key: h.key,
            value: h.value,
            disabled: !h.enabled
          })),
          body: convertToPostmanBody(httpReq.body)
        }
      })
    }
  }

  return items
}

function convertToPostmanBody(body: RequestBody): PostmanBody | undefined {
  if (body.type === 'none') return undefined

  switch (body.type) {
    case 'json':
      return {
        mode: 'raw',
        raw: body.content,
        options: { raw: { language: 'json' } }
      }
    case 'raw':
      return {
        mode: 'raw',
        raw: body.content
      }
    case 'form-data':
      return {
        mode: 'formdata',
        formdata: (body.formData || []).map((f) => ({
          key: f.key,
          value: f.value,
          disabled: !f.enabled
        }))
      }
    case 'x-www-form-urlencoded':
      return {
        mode: 'urlencoded',
        urlencoded: (body.formData || []).map((f) => ({
          key: f.key,
          value: f.value,
          disabled: !f.enabled
        }))
      }
    default:
      return undefined
  }
}
