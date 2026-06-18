const DB_NAME = 'estimation-cache'
const DB_VERSION = 1
const SYNC_STORE = 'sync_queue'

const STORES = [
  'projects', 'user_stories', 'ai_classifications', 'ai_overrides',
  'fpa_gsc_ratings', 'cosmic_movements', 'hybrid_criteria', 'hybrid_scores',
  'overheads', 'cost_configs', 'system_config', 'user_profile',
  'estimator_feedback', 'ai_errors'
]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      }
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const syncStore = db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true })
        syncStore.createIndex('timestamp', 'timestamp')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<any>): Promise<any> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => { resolve(req.result); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function cacheGetAll(storeName: string): Promise<any[]> {
  try { return await withStore(storeName, 'readonly', (s) => s.getAll()) } catch { return [] }
}

export async function cacheGet(storeName: string, id: string): Promise<any | null> {
  try { return await withStore(storeName, 'readonly', (s) => s.get(id)) } catch { return null }
}

export async function cachePut(storeName: string, data: any) {
  try { await withStore(storeName, 'readwrite', (s) => s.put(data)) } catch {}
}

export async function cacheDelete(storeName: string, id: string) {
  try { await withStore(storeName, 'readwrite', (s) => s.delete(id)) } catch {}
}

export async function cacheClear(storeName: string) {
  try { await withStore(storeName, 'readwrite', (s) => s.clear()) } catch {}
}

export async function cachePutAll(storeName: string, items: any[]) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const item of items) store.put(item)
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })
}

export async function enqueueSync(operation: { method: string; url: string; body?: any; timestamp: string }) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, 'readwrite')
    const store = tx.objectStore(SYNC_STORE)
    store.add(operation)
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })
}

export async function getSyncQueue(): Promise<any[]> {
  try { return await withStore(SYNC_STORE, 'readonly', (s) => s.getAll()) } catch { return [] }
}

export async function clearSyncQueue() {
  try { await withStore(SYNC_STORE, 'readwrite', (s) => s.clear()) } catch {}
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getSyncQueue()
  let synced = 0
  let failed = 0
  for (const item of queue) {
    try {
      const opts: RequestInit = { method: item.method, headers: { 'Content-Type': 'application/json' } }
      if (item.body) opts.body = JSON.stringify(item.body)
      const res = await fetch(item.url, opts)
      if (res.ok) synced++
      else failed++
    } catch {
      failed++
    }
  }
  if (failed === 0) await clearSyncQueue()
  return { synced, failed }
}

export async function fetchWithCache(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options)
    if (res.ok && res.status !== 204) {
      const clone = res.clone()
      try {
        const data = await clone.json()
        const match = url.match(/\/api\/(\w+)(?:\/|$)/)
        if (match && Array.isArray(data) && !url.includes('?')) {
          await cachePutAll(match[1], data)
        } else if (match && !Array.isArray(data) && data.id) {
          await cachePut(match[1], data)
        }
      } catch {}
    }
    return res
  } catch {
    const match = url.match(/\/api\/(\w+)(?:\/|$)/)
    if (match) {
      const data = await cacheGetAll(match[1])
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      })
    }
    throw new Error('Network offline and no cached data available')
  }
}

export async function fetchWithOfflineSupport(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const res = await fetch(url, options)
    if (res.ok) {
      const clone = res.clone()
      try {
        const data = await clone.json()
        const match = url.match(/\/api\/(\w+)/)
        if (match) {
          if (options.method === 'DELETE') {
            await cacheDelete(match[1], url.split('/').pop()!)
          } else if (data.id || Array.isArray(data)) {
            await cachePutAll(match[1], Array.isArray(data) ? data : [data])
          }
        }
      } catch {}
    }
    return res
  } catch {
    await enqueueSync({ method: options.method || 'GET', url, body: options.body ? JSON.parse(options.body as string) : undefined, timestamp: new Date().toISOString() })
    throw new Error('Offline: operation queued for sync')
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch('/api/debug-limit', { method: 'HEAD' })
    return res.ok
  } catch { return false }
}
