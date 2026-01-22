import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'fs'
import { createRequire } from 'module'
import type {
  Collection,
  Folder,
  CollectionRequest,
  Environment,
  HistoryEntry
} from '../../shared/types/models'

// Use createRequire to load better-sqlite3 at runtime
// This bypasses Vite's bundling which doesn't handle native modules well
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// Type definition for better-sqlite3 Database instance
type BetterSqlite3Database = {
  exec(sql: string): void
  prepare(sql: string): {
    run(...params: unknown[]): unknown
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
  }
  transaction<T>(fn: () => T): () => T
  pragma(pragma: string): unknown
  close(): void
}

let db: BetterSqlite3Database | null = null

export function getDb(): BetterSqlite3Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

function createTables(database: BetterSqlite3Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      folder_id TEXT,
      request_data TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variables TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      request_data TEXT NOT NULL,
      response_data TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_folders_collection ON folders(collection_id);
    CREATE INDEX IF NOT EXISTS idx_requests_collection ON requests(collection_id);
    CREATE INDEX IF NOT EXISTS idx_requests_folder ON requests(folder_id);
    CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);
  `)
}

interface LegacyData {
  collections: Collection[]
  folders: Folder[]
  requests: CollectionRequest[]
  environments: Environment[]
  history: HistoryEntry[]
}

function migrateFromJson(database: BetterSqlite3Database, jsonPath: string): void {
  if (!existsSync(jsonPath)) {
    return
  }

  console.log('Migrating from JSON storage to SQLite...')

  try {
    const fileContent = readFileSync(jsonPath, 'utf-8')
    const data: LegacyData = JSON.parse(fileContent)

    const insertCollection = database.prepare(`
      INSERT OR IGNORE INTO collections (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const insertFolder = database.prepare(`
      INSERT OR IGNORE INTO folders (id, collection_id, parent_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const insertRequest = database.prepare(`
      INSERT OR IGNORE INTO requests (id, collection_id, folder_id, request_data, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `)

    const insertEnvironment = database.prepare(`
      INSERT OR IGNORE INTO environments (id, name, variables, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const insertHistory = database.prepare(`
      INSERT OR IGNORE INTO history (id, request_data, response_data, timestamp)
      VALUES (?, ?, ?, ?)
    `)

    const migrate = database.transaction(() => {
      // Migrate collections
      for (const c of data.collections || []) {
        insertCollection.run(c.id, c.name, c.description || null, c.createdAt, c.updatedAt)
      }

      // Migrate folders
      for (const f of data.folders || []) {
        insertFolder.run(f.id, f.collectionId, f.parentId || null, f.name, f.createdAt, f.updatedAt)
      }

      // Migrate requests
      for (const r of data.requests || []) {
        insertRequest.run(
          r.id,
          r.collectionId,
          r.folderId || null,
          JSON.stringify(r.request),
          r.sortOrder
        )
      }

      // Migrate environments
      for (const e of data.environments || []) {
        insertEnvironment.run(
          e.id,
          e.name,
          JSON.stringify(e.variables),
          e.isActive ? 1 : 0,
          e.createdAt,
          e.updatedAt
        )
      }

      // Migrate history
      for (const h of data.history || []) {
        insertHistory.run(
          h.id,
          JSON.stringify(h.request),
          h.response ? JSON.stringify(h.response) : null,
          h.timestamp
        )
      }
    })

    migrate()

    // Rename old JSON file as backup
    const backupPath = jsonPath.replace('.json', '.json.bak')
    renameSync(jsonPath, backupPath)
    console.log(`Migration complete. Old data backed up to: ${backupPath}`)
  } catch (error) {
    console.error('Migration failed:', error)
    // Don't throw - we can still use the new empty database
  }
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  // Ensure the data directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'put-man.db')
  const jsonPath = join(dbDir, 'put-man.json')

  console.log(`Initializing SQLite database at: ${dbPath}`)

  db = new Database(dbPath)

  // Enable foreign keys and WAL mode for better performance
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  // Create tables
  createTables(db)

  // Migrate from JSON if it exists
  migrateFromJson(db, jsonPath)

  console.log('Database initialized successfully')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Legacy exports for compatibility during migration
export interface DatabaseData {
  collections: Collection[]
  folders: Folder[]
  requests: CollectionRequest[]
  environments: Environment[]
  history: HistoryEntry[]
}

export function getData(): DatabaseData {
  // This is for backwards compatibility - repositories will be updated to use SQL directly
  throw new Error('getData is deprecated - use SQL queries instead')
}

export function saveDatabase(): void {
  // No-op - SQLite handles persistence automatically
}
