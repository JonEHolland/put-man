import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type {
  Collection,
  Folder,
  CollectionRequest,
  Environment,
  HistoryEntry
} from '../../shared/types/models'

export interface DatabaseData {
  collections: Collection[]
  folders: Folder[]
  requests: CollectionRequest[]
  environments: Environment[]
  history: HistoryEntry[]
}

let data: DatabaseData = {
  collections: [],
  folders: [],
  requests: [],
  environments: [],
  history: []
}

let dbPath: string = ''

export function getData(): DatabaseData {
  return data
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  // Ensure the data directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  dbPath = join(dbDir, 'put-man.json')

  // Load existing data or use defaults
  if (existsSync(dbPath)) {
    try {
      const fileContent = readFileSync(dbPath, 'utf-8')
      data = JSON.parse(fileContent)
    } catch (error) {
      console.error('Failed to load database, using defaults:', error)
    }
  }

  console.log(`Database initialized at: ${dbPath}`)
}

export function saveDatabase(): void {
  if (dbPath) {
    writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
  }
}

export function closeDatabase(): void {
  saveDatabase()
}
