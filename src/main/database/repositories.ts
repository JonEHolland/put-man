import { v4 as uuidv4 } from 'uuid'
import { getDb } from './init'
import type {
  Collection,
  Folder,
  CollectionRequest,
  Request,
  Environment,
  HistoryEntry,
  Response
} from '../../shared/types/models'

// Row types for database results
interface CollectionRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface FolderRow {
  id: string
  collection_id: string
  parent_id: string | null
  name: string
  created_at: string
  updated_at: string
}

interface RequestRow {
  id: string
  collection_id: string
  folder_id: string | null
  request_data: string
  sort_order: number
}

interface EnvironmentRow {
  id: string
  name: string
  variables: string
  is_active: number
  created_at: string
  updated_at: string
}

interface HistoryRow {
  id: string
  request_data: string
  response_data: string | null
  timestamp: string
}

// Helper to convert database row to Collection
function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Helper to convert database row to Folder
function rowToFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    collectionId: row.collection_id,
    parentId: row.parent_id || undefined,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Helper to convert database row to CollectionRequest
function rowToRequest(row: RequestRow): CollectionRequest {
  return {
    id: row.id,
    collectionId: row.collection_id,
    folderId: row.folder_id || undefined,
    request: JSON.parse(row.request_data),
    sortOrder: row.sort_order
  }
}

// Helper to convert database row to Environment
function rowToEnvironment(row: EnvironmentRow): Environment {
  return {
    id: row.id,
    name: row.name,
    variables: JSON.parse(row.variables),
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Helper to convert database row to HistoryEntry
function rowToHistory(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    request: JSON.parse(row.request_data),
    response: row.response_data ? JSON.parse(row.response_data) : undefined,
    timestamp: row.timestamp
  }
}

// Collections repository
export const collectionsRepo = {
  getAll(): Collection[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM collections ORDER BY name ASC')
      .all() as CollectionRow[]
    return rows.map(rowToCollection)
  },

  create(name: string, description?: string): Collection {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO collections (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description || null, now, now)

    return {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now
    }
  },

  update(id: string, updates: Partial<Collection>): Collection {
    const db = getDb()
    const now = new Date().toISOString()

    // Get current collection
    const row = db
      .prepare('SELECT * FROM collections WHERE id = ?')
      .get(id) as CollectionRow | undefined
    if (!row) throw new Error('Collection not found')

    const updated = {
      name: updates.name ?? row.name,
      description: updates.description ?? row.description
    }

    db.prepare(`
      UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?
    `).run(updated.name, updated.description || null, now, id)

    return {
      id,
      name: updated.name,
      description: updated.description || undefined,
      createdAt: row.created_at,
      updatedAt: now
    }
  },

  delete(id: string): void {
    const db = getDb()
    // Foreign key cascade will handle folders and requests
    db.prepare('DELETE FROM collections WHERE id = ?').run(id)
  }
}

// Folders repository
export const foldersRepo = {
  getByCollection(collectionId: string): Folder[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM folders WHERE collection_id = ? ORDER BY name ASC')
      .all(collectionId) as FolderRow[]
    return rows.map(rowToFolder)
  },

  create(collectionId: string, name: string, parentId?: string): Folder {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO folders (id, collection_id, parent_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, collectionId, parentId || null, name, now, now)

    return {
      id,
      collectionId,
      parentId,
      name,
      createdAt: now,
      updatedAt: now
    }
  },

  update(id: string, updates: Partial<Folder>): Folder {
    const db = getDb()
    const now = new Date().toISOString()

    const row = db
      .prepare('SELECT * FROM folders WHERE id = ?')
      .get(id) as FolderRow | undefined
    if (!row) throw new Error('Folder not found')

    const updated = {
      name: updates.name ?? row.name,
      parentId: updates.parentId !== undefined ? updates.parentId : row.parent_id
    }

    db.prepare(`
      UPDATE folders SET name = ?, parent_id = ?, updated_at = ? WHERE id = ?
    `).run(updated.name, updated.parentId || null, now, id)

    return {
      id,
      collectionId: row.collection_id,
      parentId: updated.parentId || undefined,
      name: updated.name,
      createdAt: row.created_at,
      updatedAt: now
    }
  },

  delete(id: string): void {
    const db = getDb()
    // Delete child folders first (recursive via transaction)
    const deleteRecursive = db.transaction(() => {
      const childFolders = db
        .prepare('SELECT id FROM folders WHERE parent_id = ?')
        .all(id) as { id: string }[]
      for (const child of childFolders) {
        this.delete(child.id)
      }
      // Requests with this folder_id will have folder_id set to NULL via foreign key
      db.prepare('DELETE FROM folders WHERE id = ?').run(id)
    })
    deleteRecursive()
  }
}

// Requests repository
export const requestsRepo = {
  getByCollection(collectionId: string): CollectionRequest[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY sort_order ASC')
      .all(collectionId) as RequestRow[]
    return rows.map(rowToRequest)
  },

  save(collectionId: string, request: Request, folderId?: string): CollectionRequest {
    const db = getDb()
    const id = uuidv4()

    // Get max sort order
    const maxRow = db
      .prepare('SELECT MAX(sort_order) as max_order FROM requests WHERE collection_id = ?')
      .get(collectionId) as { max_order: number | null }
    const sortOrder = (maxRow.max_order ?? -1) + 1

    db.prepare(`
      INSERT INTO requests (id, collection_id, folder_id, request_data, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, collectionId, folderId || null, JSON.stringify(request), sortOrder)

    return {
      id,
      collectionId,
      folderId,
      request,
      sortOrder
    }
  },

  update(id: string, request: Request): CollectionRequest {
    const db = getDb()

    const row = db
      .prepare('SELECT * FROM requests WHERE id = ?')
      .get(id) as RequestRow | undefined
    if (!row) throw new Error('Request not found')

    db.prepare('UPDATE requests SET request_data = ? WHERE id = ?').run(
      JSON.stringify(request),
      id
    )

    return {
      id,
      collectionId: row.collection_id,
      folderId: row.folder_id || undefined,
      request,
      sortOrder: row.sort_order
    }
  },

  delete(id: string): void {
    const db = getDb()
    db.prepare('DELETE FROM requests WHERE id = ?').run(id)
  },

  move(id: string, targetFolderId: string | null): CollectionRequest {
    const db = getDb()

    const row = db
      .prepare('SELECT * FROM requests WHERE id = ?')
      .get(id) as RequestRow | undefined
    if (!row) throw new Error('Request not found')

    db.prepare('UPDATE requests SET folder_id = ? WHERE id = ?').run(
      targetFolderId,
      id
    )

    return {
      id,
      collectionId: row.collection_id,
      folderId: targetFolderId || undefined,
      request: JSON.parse(row.request_data),
      sortOrder: row.sort_order
    }
  }
}

// Environments repository
export const environmentsRepo = {
  getAll(): Environment[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM environments ORDER BY name ASC')
      .all() as EnvironmentRow[]
    return rows.map(rowToEnvironment)
  },

  create(name: string): Environment {
    const db = getDb()
    const now = new Date().toISOString()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO environments (id, name, variables, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, '[]', 0, now, now)

    return {
      id,
      name,
      variables: [],
      isActive: false,
      createdAt: now,
      updatedAt: now
    }
  },

  update(id: string, updates: Partial<Environment>): Environment {
    const db = getDb()
    const now = new Date().toISOString()

    const row = db
      .prepare('SELECT * FROM environments WHERE id = ?')
      .get(id) as EnvironmentRow | undefined
    if (!row) throw new Error('Environment not found')

    const updated = {
      name: updates.name ?? row.name,
      variables: updates.variables ?? JSON.parse(row.variables),
      isActive: updates.isActive !== undefined ? updates.isActive : row.is_active === 1
    }

    db.prepare(`
      UPDATE environments SET name = ?, variables = ?, is_active = ?, updated_at = ? WHERE id = ?
    `).run(updated.name, JSON.stringify(updated.variables), updated.isActive ? 1 : 0, now, id)

    return {
      id,
      name: updated.name,
      variables: updated.variables,
      isActive: updated.isActive,
      createdAt: row.created_at,
      updatedAt: now
    }
  },

  setActive(id: string | null): void {
    const db = getDb()
    const transaction = db.transaction(() => {
      // Deactivate all
      db.prepare('UPDATE environments SET is_active = 0').run()
      // Activate the selected one
      if (id) {
        db.prepare('UPDATE environments SET is_active = 1 WHERE id = ?').run(id)
      }
    })
    transaction()
  },

  delete(id: string): void {
    const db = getDb()
    db.prepare('DELETE FROM environments WHERE id = ?').run(id)
  }
}

// History repository
export const historyRepo = {
  getAll(limit = 100): HistoryEntry[] {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM history ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as HistoryRow[]
    return rows.map(rowToHistory)
  },

  add(request: Request, response?: Response): HistoryEntry {
    const db = getDb()
    const id = uuidv4()
    const timestamp = new Date().toISOString()

    db.prepare(`
      INSERT INTO history (id, request_data, response_data, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(id, JSON.stringify(request), response ? JSON.stringify(response) : null, timestamp)

    // Keep only last 1000 entries
    db.prepare(`
      DELETE FROM history WHERE id NOT IN (
        SELECT id FROM history ORDER BY timestamp DESC LIMIT 1000
      )
    `).run()

    return {
      id,
      request,
      response,
      timestamp
    }
  },

  clear(): void {
    const db = getDb()
    db.prepare('DELETE FROM history').run()
  }
}
