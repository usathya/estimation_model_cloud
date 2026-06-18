import { createHash } from 'crypto'

export function toValidUuid(input: string): string {
  if (!input) return '00000000-0000-0000-0000-000000000000'
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(input)) return input.toLowerCase()
  const hash = createHash('md5').update(input).digest('hex')
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${((parseInt(hash.substring(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, '0')}-${hash.substring(20, 32)}`.toLowerCase()
}

interface EnvBindings {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  KV_CACHE?: KVNamespace
}

function getBaseUrl(env: EnvBindings): string {
  const url = env.SUPABASE_URL || ''
  return url.replace(/\/+$/, '')
}

function getHeaders(env: EnvBindings): Record<string, string> {
  return {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY || '',
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

async function request(env: EnvBindings, path: string, options: RequestInit = {}): Promise<any> {
  const baseUrl = getBaseUrl(env)
  if (!baseUrl || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  }
  const url = `${baseUrl}/rest/v1/${path}`
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(env), ...options.headers as Record<string, string> }
  })
  if (res.status === 204) return null
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}: ${body.message || JSON.stringify(body)}`)
  }
  return body
}

function buildQueryString(params: Record<string, any>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

function buildSelectQuery(table: string, columns = '*'): string {
  return `${table}?select=${encodeURIComponent(columns)}`
}

export function isSupabaseConfigured(env: EnvBindings): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function supabaseSelect(env: EnvBindings, table: string, filters?: Record<string, any>, columns?: string): Promise<any[]> {
  let path = buildSelectQuery(table, columns)
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        path += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      }
    }
  }
  return request(env, path, { method: 'GET' })
}

export async function supabaseSelectSingle(env: EnvBindings, table: string, filters: Record<string, any>, columns?: string): Promise<any | null> {
  const results = await supabaseSelect(env, table, { ...filters, limit: '1' }, columns)
  return results?.[0] ?? null
}

export async function supabaseInsert(env: EnvBindings, table: string, data: any | any[]): Promise<any[]> {
  return request(env, table, {
    method: 'POST',
    body: JSON.stringify(Array.isArray(data) ? data : [data]),
    headers: { 'Prefer': 'return=representation' }
  })
}

export async function supabaseUpsert(env: EnvBindings, table: string, data: any | any[], onConflict?: string): Promise<any[]> {
  const headers: Record<string, string> = { 'Prefer': 'return=representation,resolution=merge-duplicates' }
  if (onConflict) {
    headers['Prefer'] = `return=representation,resolution=merge-duplicates`
    const path = `${table}?on_conflict=${encodeURIComponent(onConflict)}`
    return request(env, path, { method: 'POST', body: JSON.stringify(Array.isArray(data) ? data : [data]), headers })
  }
  return request(env, table, { method: 'POST', body: JSON.stringify(Array.isArray(data) ? data : [data]), headers })
}

export async function supabaseUpdate(env: EnvBindings, table: string, data: any, filters: Record<string, any>): Promise<any[]> {
  const path = table + buildQueryString(filters)
  return request(env, path, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Prefer': 'return=representation' } })
}

export async function supabaseDelete(env: EnvBindings, table: string, filters: Record<string, any>): Promise<void> {
  await request(env, table + buildQueryString(filters), { method: 'DELETE' })
}

export async function supabaseConnectionTest(env: EnvBindings): Promise<{ active: boolean; results: Record<string, string>; reason: string; connection_endpoint?: string; isConfigCompleted?: boolean }> {
  const results: Record<string, string> = {}
  if (!isSupabaseConfigured(env)) {
    return { active: false, results, reason: 'Supabase not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.' }
  }
  const url = env.SUPABASE_URL || ''
  const masked = url ? url.replace(/\/\/[^@]+@/, '//***@') : ''
  const tables = ['user_profiles','projects','user_stories','ai_classifications','ai_overrides','fpa_gsc_ratings','cosmic_movements','hybrid_criteria','hybrid_scores','overheads','cost_config','system_config','cf_ai_usage','groq_usage','gemini_usage','ai_errors','overhead_templates']
  for (const table of tables) {
    try {
      await supabaseSelect(env, table, { limit: '1' })
      results[table] = 'ACTIVE'
    } catch {
      results[table] = 'ERROR'
    }
  }
  const active = Object.values(results).some(v => v === 'ACTIVE')
  return { active, results, reason: 'Connection test completed.', connection_endpoint: masked, isConfigCompleted: active }
}

export async function kvCacheGet<T>(kv: KVNamespace | undefined, key: string): Promise<T | null> {
  if (!kv) return null
  try {
    const val = await kv.get(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export async function kvCachePut(kv: KVNamespace | undefined, key: string, value: any, ttl?: number): Promise<void> {
  if (!kv) return
  try {
    await kv.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined)
  } catch {}
}

export async function kvCacheDelete(kv: KVNamespace | undefined, key: string): Promise<void> {
  if (!kv) return
  try { await kv.delete(key) } catch {}
}
