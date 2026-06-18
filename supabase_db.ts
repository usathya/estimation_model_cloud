import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Local DB file context helper
function getDbFilePath() {
  if (typeof process !== 'undefined' && process.cwd) {
    try {
      return path.join(process.cwd(), 'db.json');
    } catch (e) {
      return 'db.json';
    }
  }
  return 'db.json';
}

function readLocalDb() {
  const dbFile = getDbFilePath();
  if (typeof fs.existsSync !== 'function' || !fs.existsSync(dbFile)) {
    return null;
  }
  try {
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return null;
  }
}

// Deterministic UUID generation function
export function toValidUuid(input: string): string {
  if (!input) {
    return '00000000-0000-0000-0000-000000000000';
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) {
    return input.toLowerCase();
  }

  // Hash the input string using MD5 to produce a deterministic 32-character hex sequence
  const hash = createHash('md5').update(input).digest('hex');
  const part1 = hash.substring(0, 8);
  const part2 = hash.substring(8, 12);
  const part3 = '4' + hash.substring(13, 16); // force version 4 representation
  const part4 = ((parseInt(hash.substring(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, '0'); // force variant
  const part5 = hash.substring(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}

// --- DATABASE INTEGRATION MODEL MAPPERS ---

export function mapUserProfileToDb(profile: any) {
  if (!profile) return null;
  const allowedRoles = ['admin', 'estimator', 'viewer'];
  const cleanRole = allowedRoles.includes(profile.role) ? profile.role : 'estimator';
  return {
    id: toValidUuid(profile.id),
    full_name: profile.full_name || null,
    organisation: profile.organisation || null,
    role: cleanRole,
    jira_config: profile.jira_config || null,
    azure_config: profile.azure_config || null,
    created_at: profile.created_at || new Date().toISOString()
  };
}

export function mapProjectToDb(proj: any) {
  if (!proj) return null;
  return {
    id: toValidUuid(proj.id),
    name: proj.name,
    client: proj.client || null,
    description: proj.description || null,
    version: proj.version || null,
    project_type: proj.project_type || null,
    estimator_id: proj.estimator_id ? toValidUuid(proj.estimator_id) : null,
    status: proj.status || 'Draft',
    currency: proj.currency || 'USD',
    team_size: proj.team_size ? Math.round(Number(proj.team_size)) : 5,
    created_at: proj.created_at || new Date().toISOString(),
    updated_at: proj.updated_at || new Date().toISOString(),
    actual_cost: proj.actual_cost !== undefined && proj.actual_cost !== null ? Number(proj.actual_cost) : null,
    actual_effort_days: proj.actual_effort_days !== undefined && proj.actual_effort_days !== null ? Number(proj.actual_effort_days) : null,
    actual_duration_months: proj.actual_duration_months !== undefined && proj.actual_duration_months !== null ? Number(proj.actual_duration_months) : null
  };
}

export function mapUserStoryToDb(story: any) {
  if (!story) return null;
  return {
    id: toValidUuid(story.id),
    project_id: toValidUuid(story.project_id),
    story_id: story.story_id || null,
    role: story.role || null,
    goal: story.goal || null,
    benefit: story.benefit || null,
    epic: story.epic || null,
    module: story.module || null,
    priority: story.priority || 'Medium',
    source: story.source || 'manual',
    raw_text: story.raw_text || null,
    ai_status: story.ai_status || 'pending',
    tags: story.tags || null,
    story_points: story.story_points !== undefined ? story.story_points : null,
    created_at: story.created_at || new Date().toISOString()
  };
}

export function mapAiClassificationToDb(c: any) {
  if (!c) return null;
  const allowedTypes = ['fpa', 'cosmic', 'hybrid'];
  const cleanType = allowedTypes.includes(c.model_type) ? c.model_type : 'fpa';
  const normConfidence = c.confidence ? Math.max(0, Math.min(100, Math.round(Number(c.confidence)))) : null;
  return {
    id: toValidUuid(c.id),
    story_id: toValidUuid(c.story_id),
    model_type: cleanType,
    classification: c.classification || null,
    confidence: normConfidence,
    flags: c.flags || null,
    ai_provider: c.ai_provider || null,
    created_at: c.created_at || new Date().toISOString()
  };
}

export function mapAiOverrideToDb(o: any) {
  if (!o) return null;
  return {
    id: toValidUuid(o.id),
    story_id: toValidUuid(o.story_id),
    user_id: o.user_id ? toValidUuid(o.user_id) : null,
    model_type: o.model_type || 'generic',
    field_changed: o.field_changed || o.field_name || 'unknown',
    original_value: o.original_value !== undefined ? String(o.original_value) : (o.old_value !== undefined ? String(o.old_value) : null),
    override_value: o.override_value !== undefined ? String(o.override_value) : (o.new_value !== undefined ? String(o.new_value) : null),
    reason: o.reason || 'Not specified',
    created_at: o.created_at || new Date().toISOString()
  };
}

export function mapFpaGscRatingToDb(r: any) {
  if (!r) return null;
  const gsc = Math.max(1, Math.min(14, Math.round(Number(r.gsc_number))));
  const rating = Math.max(0, Math.min(5, Math.round(Number(r.rating))));
  return {
    id: toValidUuid(`${r.project_id}_gsc_${gsc}`),
    project_id: toValidUuid(r.project_id),
    gsc_number: gsc,
    rating: rating
  };
}

export function mapCosmicMovementToDb(m: any) {
  if (!m) return null;
  const allowedMoves = ['Entry', 'Exit', 'Read', 'Write'];
  const cleanMove = allowedMoves.includes(m.movement_type) ? m.movement_type : 'Entry';
  return {
    id: toValidUuid(m.id),
    story_id: toValidUuid(m.story_id),
    name: m.name || null,
    movement_type: cleanMove,
    data_group: m.data_group || null,
    reasoning: m.reasoning || null,
    is_ai_generated: m.is_ai_generated !== false,
    created_at: m.created_at || new Date().toISOString()
  };
}

export function mapHybridCriterionToDb(c: any) {
  if (!c) return null;
  return {
    id: toValidUuid(c.id),
    project_id: toValidUuid(c.project_id),
    name: c.name,
    max_score: c.max_score ? Math.round(Number(c.max_score)) : 10,
    weight_percent: c.weight_percent ? Number(c.weight_percent) : 0,
    description: c.description || null,
    sort_order: c.sort_order ? Math.round(Number(c.sort_order)) : 0
  };
}

export function mapHybridScoreToDb(s: any) {
  if (!s) return null;
  return {
    id: toValidUuid(s.id),
    story_id: toValidUuid(s.story_id),
    criterion_id: toValidUuid(s.criterion_id),
    score: s.score ? Number(s.score) : 0,
    is_ai_suggested: s.is_ai_suggested !== false
  };
}

export function mapOverheadToDb(o: any) {
  if (!o) return null;
  const cleanMethod = ['percentage', 'fixed'].includes(o.method) ? o.method : 'percentage';
  return {
    id: toValidUuid(o.id),
    project_id: toValidUuid(o.project_id),
    name: o.name,
    applies_to: o.applies_to || { fpa: true, cosmic: true, hybrid: true },
    method: cleanMethod,
    value: o.value ? Number(o.value) : 0,
    is_active: o.is_active !== false,
    sort_order: o.sort_order ? Math.round(Number(o.sort_order)) : 0
  };
}

export function mapCostConfigToDb(c: any) {
  if (!c) return null;
  return {
    id: toValidUuid(`cost_config_${c.project_id}`),
    project_id: toValidUuid(c.project_id),
    fpa_cost_per_point: c.fpa_cost_per_point !== undefined && c.fpa_cost_per_point !== null ? Number(c.fpa_cost_per_point) : 500,
    cosmic_cost_per_point: c.cosmic_cost_per_point !== undefined && c.cosmic_cost_per_point !== null ? Number(c.cosmic_cost_per_point) : 500,
    hybrid_cost_per_point: c.hybrid_cost_per_point !== undefined && c.hybrid_cost_per_point !== null ? Number(c.hybrid_cost_per_point) : 500,
    productivity_rate: c.productivity_rate !== undefined && c.productivity_rate !== null ? Number(c.productivity_rate) : 1.5,
    fpa_productivity_rate: c.fpa_productivity_rate !== undefined && c.fpa_productivity_rate !== null ? Number(c.fpa_productivity_rate) : 0.75,
    cosmic_productivity_rate: c.cosmic_productivity_rate !== undefined && c.cosmic_productivity_rate !== null ? Number(c.cosmic_productivity_rate) : 1.5,
    hybrid_productivity_rate: c.hybrid_productivity_rate !== undefined && c.hybrid_productivity_rate !== null ? Number(c.hybrid_productivity_rate) : 1.5,
    working_days_per_month: c.working_days_per_month !== undefined && c.working_days_per_month !== null ? Math.round(Number(c.working_days_per_month)) : 22,
    use_role_rates: c.use_role_rates === true,
    blended_rate: c.blended_rate !== undefined && c.blended_rate !== null ? Number(c.blended_rate) : null,
    roles: c.roles || null
  };
}

export function mapSystemConfigToDb(s: any) {
  if (!s) return null;
  return {
    id: 'd0000000-0000-0000-0000-000000000000',
    default_currency: s.default_currency || 'USD',
    default_productivity_rate: s.default_productivity_rate ? Number(s.default_productivity_rate) : 1.5,
    default_fpa_cost_per_point: s.default_fpa_cost_per_point ? Number(s.default_fpa_cost_per_point) : 500,
    default_cosmic_cost_per_point: s.default_cosmic_cost_per_point ? Number(s.default_cosmic_cost_per_point) : 500,
    default_hybrid_cost_per_point: s.default_hybrid_cost_per_point ? Number(s.default_hybrid_cost_per_point) : 500,
    ai_primary_provider: s.ai_primary_provider || 'cloudflare',
    cf_ai_model: s.cf_ai_model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    groq_model: s.groq_model || 'llama-3.3-70b-versatile',
    gemini_enabled: s.gemini_enabled === true,
    ai_fallback_enabled: s.ai_fallback_enabled !== false,
    jira_url: s.jira_url || null,
    jira_project_key: s.jira_project_key || null,
    azure_org_url: s.azure_org_url || null,
    azure_project: s.azure_project || null,
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString()
  };
}

// --- DB PARITY READING TRANSLATIONS ---

export function mapAiOverrideFromDb(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    story_id: row.story_id,
    user_id: row.user_id,
    model_type: row.model_type,
    field_name: row.field_changed || 'unknown',
    old_value: row.original_value,
    new_value: row.override_value,
    reason: row.reason,
    created_at: row.created_at
  };
}

// Supabase lazy client initialization
let supabaseInstance: any = null;

export function getSupabaseClient(env?: any) {
  if (!supabaseInstance) {
    const url = env?.SUPABASE_URL || process.env.SUPABASE_URL;
    const key = env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && url !== '' && key !== '') {
      try {
        supabaseInstance = createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        });
        console.log('★ [SUPABASE] Client successfully initialized!');
      } catch (err) {
        console.error('★ [SUPABASE] Initialization failed:', err);
      }
    }
  }
  return supabaseInstance;
}

export function isSupabaseActive(env?: any): boolean {
  return !!getSupabaseClient(env);
}

/**
 * Executes a Supabase database action with standard fallback to local memory db.json.
 */
export async function resilientQuery<T>(
  supabaseAction: (client: any) => Promise<{ data: T | null; error: any }>,
  localAction: () => T,
  writeToLocalOnChanges?: (data: T) => void,
  env?: any
): Promise<T> {
  const client = getSupabaseClient(env);
  if (client) {
    try {
      const { data, error } = await supabaseAction(client);
      if (!error && data !== null) {
        return data;
      }
      if (error) {
        console.warn('★ [SUPABASE] Query failed, falling back to local JSON data. Error details:', error);
      }
    } catch (err) {
      console.warn('★ [SUPABASE] Exception in query, falling back to local JSON data. Exception details:', err);
    }
  }

  // Local fallback
  const result = localAction();
  if (writeToLocalOnChanges) {
    writeToLocalOnChanges(result);
  }
  return result;
}

/**
 * Resiliently executes a write (insert, update, upsert, delete) to Supabase, falling back to local JSON.
 */
export async function resilientWrite<T>(
  supabaseAction: (client: any) => Promise<{ data: T | null; error: any }>,
  localAction: () => T,
  env?: any
): Promise<T> {
  const client = getSupabaseClient(env);
  if (client) {
    try {
      const { data, error } = await supabaseAction(client);
      if (!error) {
        try {
          localAction();
        } catch (localErr) {
          // ignore local sync mishaps
        }
        if (data !== null) return data;
        return localAction();
      }
      console.warn('★ [SUPABASE] Write failed, using local database. Error:', error);
    } catch (err) {
      console.warn('★ [SUPABASE] Write exception: using local database. Exception:', err);
    }
  }
  return localAction();
}

/**
 * Helper endpoint to retrieve Supabase status for the admin diagnostic screen.
 */
export async function testSupabaseConnectionDetail(env?: any) {
  const client = getSupabaseClient(env);
  const results: Record<string, 'ACTIVE' | 'ERROR' | 'MISSING'> = {
    connection: 'MISSING',
    user_profiles: 'MISSING',
    projects: 'MISSING',
    user_stories: 'MISSING',
    ai_classifications: 'MISSING',
    ai_overrides: 'MISSING',
    fpa_gsc_ratings: 'MISSING',
    cosmic_movements: 'MISSING',
    hybrid_criteria: 'MISSING',
    hybrid_scores: 'MISSING',
    overheads: 'MISSING',
    cost_config: 'MISSING',
    system_config: 'MISSING',
    cf_ai_usage: 'MISSING',
    groq_usage: 'MISSING',
    gemini_usage: 'MISSING',
    ai_errors: 'MISSING',
    overhead_templates: 'MISSING'
  };

  if (!client) {
    return { active: false, results, reason: 'Supabase URL or Service Role key environment variables are not set.' };
  }

  results.connection = 'ACTIVE';
  const tables = [
    'user_profiles', 'projects', 'user_stories', 'ai_classifications', 'ai_overrides',
    'fpa_gsc_ratings', 'cosmic_movements', 'hybrid_criteria', 'hybrid_scores', 'overheads',
    'cost_config', 'system_config', 'cf_ai_usage', 'groq_usage', 'gemini_usage',
    'ai_errors', 'overhead_templates'
  ];

  for (const table of tables) {
    try {
      const { error } = await client.from(table).select('*').limit(1);
      if (error) {
        results[table] = 'ERROR';
      } else {
        results[table] = 'ACTIVE';
      }
    } catch (err) {
      results[table] = 'ERROR';
    }
  }

  const isConfigCompleted = Object.values(results).every(status => status === 'ACTIVE');
  const activeUrl = env?.SUPABASE_URL || process.env.SUPABASE_URL;

  return {
    active: true,
    connection_endpoint: activeUrl,
    results,
    isConfigCompleted,
    reason: isConfigCompleted
      ? 'Fully integrated and synced with production!'
      : 'Supabase connected, but some database tables are missing. Please run the migration script.'
  };
}

/**
 * processes pending changes queued when Supabase is offline/unreachable.
 */
export async function processSyncQueue(db: any, env?: any): Promise<{ success: boolean; logs: string[] }> {
  const client = getSupabaseClient(env);
  const logs: string[] = [];
  if (!client) {
    return { success: false, logs: ['Supabase client not active. Cannot process sync queue.'] };
  }

  db.sync_queue = db.sync_queue || [];
  if (db.sync_queue.length === 0) {
    db.needs_sync = false;
    return { success: true, logs: ['Sync queue is empty.'] };
  }

  logs.push(`Starting processing of sync queue containing ${db.sync_queue.length} items...`);
  let successCount = 0;
  
  // Clone the queue and process items sequentially
  const queue = [...db.sync_queue];
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      logs.push(`Syncing table [${item.table}]...`);
      const { error } = await client.from(item.table).upsert(item.payload, item.options || {});
      if (error) {
        logs.push(`Failed to sync table [${item.table}]: ${error.message}`);
        // Stop processing to preserve order of operations
        break;
      } else {
        logs.push(`Successfully synced table [${item.table}].`);
        // Remove item from DB sync_queue
        db.sync_queue.shift();
        successCount++;
      }
    } catch (err: any) {
      logs.push(`Exception syncing table [${item.table}]: ${err.message || err}`);
      break;
    }
  }

  // Update needs_sync flag
  db.needs_sync = db.sync_queue.length > 0;

  // Persist updated database cache
  if (env?.ESTIMATION_DB) {
    await env.ESTIMATION_DB.put("estimation_db_json", JSON.stringify(db));
  } else {
    const dbFile = getDbFilePath();
    if (typeof fs.writeFileSync === 'function') {
      try {
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to write db.json on local filesystem', e);
      }
    }
  }

  logs.push(`Sync queue processing finished. Synced: ${successCount}, Remaining: ${db.sync_queue.length}.`);
  return { success: db.sync_queue.length === 0, logs };
}

// Background sync edits to Supabase in the background (or queue on failure)
export async function syncChangesToSupabase(db: any, tablesToSync?: string[], env?: any) {
  const client = getSupabaseClient(env);
  
  // Initialize sync_queue if it doesn't exist
  db.sync_queue = db.sync_queue || [];

  if (!client) {
    console.log('★ [SUPABASE] Client not active. Queueing sync operations.');
    db.needs_sync = true;
    return;
  }

  try {
    const profileDb = db.user_profile ? mapUserProfileToDb(db.user_profile) : null;
    const projectsDb = (db.projects || []).map(mapProjectToDb).filter(Boolean);
    const storiesDb = (db.user_stories || []).map(mapUserStoryToDb).filter(Boolean);
    const classifsDb = (db.ai_classifications || []).map(mapAiClassificationToDb).filter(Boolean);
    const overridesDb = (db.ai_overrides || []).map(mapAiOverrideToDb).filter(Boolean);
    const movementsDb = (db.cosmic_movements || []).map(mapCosmicMovementToDb).filter(Boolean);
    const criteriaDb = (db.hybrid_criteria || []).map(mapHybridCriterionToDb).filter(Boolean);
    const scoresDb = (db.hybrid_scores || []).map(mapHybridScoreToDb).filter(Boolean);
    const overheadsDb = (db.overheads || []).map(mapOverheadToDb).filter(Boolean);
    const costConfigsDb = (db.cost_configs || []).map(mapCostConfigToDb).filter(Boolean);
    const ratingsDb = (db.fpa_gsc_ratings || []).map(mapFpaGscRatingToDb).filter(Boolean);
    const systemConfigDb = db.system_config ? mapSystemConfigToDb(db.system_config) : null;

    const baseTasks = [
      { name: 'user_profiles', payload: profileDb ? [profileDb] : null },
      { name: 'projects', payload: projectsDb.length > 0 ? projectsDb : null },
      { name: 'user_stories', payload: storiesDb.length > 0 ? storiesDb : null },
      { name: 'ai_classifications', payload: classifsDb.length > 0 ? classifsDb : null },
      { name: 'ai_overrides', payload: overridesDb.length > 0 ? overridesDb : null },
      { name: 'cosmic_movements', payload: movementsDb.length > 0 ? movementsDb : null },
      { name: 'hybrid_criteria', payload: criteriaDb.length > 0 ? criteriaDb : null },
      { name: 'hybrid_scores', payload: scoresDb.length > 0 ? scoresDb : null },
      { name: 'overheads', payload: overheadsDb.length > 0 ? overheadsDb : null },
      { name: 'cost_config', payload: costConfigsDb.length > 0 ? costConfigsDb : null },
      { name: 'fpa_gsc_ratings', payload: ratingsDb.length > 0 ? ratingsDb : null },
      { name: 'system_config', payload: systemConfigDb ? [systemConfigDb] : null }
    ];

    const tasks = baseTasks.filter(task => !tablesToSync || tablesToSync.includes(task.name));

    let localDbWriteNeeded = false;

    for (const task of tasks) {
      if (task.payload) {
        try {
          const options: any = {};
          if (task.name === 'cost_config') {
            options.onConflict = 'project_id';
          } else if (task.name === 'ai_classifications') {
            options.onConflict = 'story_id,model_type';
          } else if (task.name === 'fpa_gsc_ratings') {
            options.onConflict = 'project_id,gsc_number';
          } else if (task.name === 'hybrid_scores') {
            options.onConflict = 'story_id,criterion_id';
          }

          let { error } = await client.from(task.name).upsert(task.payload, options);
          if (error && task.name === 'user_stories') {
            const isMissingColumn = error.message.includes('story_points') || 
                                    error.message.includes('column') || 
                                    error.code === '42703';
            if (isMissingColumn) {
              console.log('★ [SUPABASE] Retrying user_stories upsert without story_points column...');
              const strippedStories = task.payload.map(({ story_points, ...rest }: any) => rest);
              const retryRes = await client.from(task.name).upsert(strippedStories, options);
              error = retryRes.error;
            }
          }
          if (error && task.name === 'projects') {
            const isMissingColumn = error.message.includes('actual_cost') || 
                                    error.message.includes('actual_effort_days') || 
                                    error.message.includes('actual_duration_months') || 
                                    error.message.includes('column') || 
                                    error.code === '42703';
            if (isMissingColumn) {
              console.log('★ [SUPABASE] Retrying projects upsert without actual_cost/effort/duration metrics...');
              const strippedProjects = task.payload.map(({ actual_cost, actual_effort_days, actual_duration_months, ...rest }: any) => rest);
              const retryRes = await client.from(task.name).upsert(strippedProjects, options);
              error = retryRes.error;
            }
          }
          if (error && task.name === 'cost_config') {
            const isMissingColumn = error.message.includes('fpa_productivity_rate') || 
                                    error.message.includes('cosmic_productivity_rate') || 
                                    error.message.includes('hybrid_productivity_rate') || 
                                    error.message.includes('blended_rate') || 
                                    error.message.includes('column') || 
                                    error.code === '42703';
            if (isMissingColumn) {
              console.log('★ [SUPABASE] Retrying cost_config upsert without specific columns...');
              const strippedConfigs = task.payload.map(({ fpa_productivity_rate, cosmic_productivity_rate, hybrid_productivity_rate, blended_rate, ...rest }: any) => rest);
              const retryRes = await client.from(task.name).upsert(strippedConfigs, options);
              error = retryRes.error;
            }
          }
          if (error) {
            console.error(`★ [SUPABASE-WRITE-ERROR] Failed to upsert table ${task.name}:`, error.message, error.details || '');
            // Queue write failure
            db.sync_queue.push({
              table: task.name,
              payload: task.payload,
              options: options,
              timestamp: new Date().toISOString()
            });
            db.needs_sync = true;
            localDbWriteNeeded = true;
          }
        } catch (innerErr) {
          console.error(`★ [SUPABASE-WRITE-EXCEPTION] Exception in upsert table ${task.name}:`, innerErr);
          // Queue write exception
          db.sync_queue.push({
            table: task.name,
            payload: task.payload,
            options: {},
            timestamp: new Date().toISOString()
          });
          db.needs_sync = true;
          localDbWriteNeeded = true;
        }
      }
    }

    if (localDbWriteNeeded) {
      // Save changes back to local db.json / KV
      if (env?.ESTIMATION_DB) {
        await env.ESTIMATION_DB.put("estimation_db_json", JSON.stringify(db));
      } else {
        const dbFile = getDbFilePath();
        if (typeof fs.writeFileSync === 'function') {
          try {
            fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
          } catch (e) {
            console.error('Failed to write db.json on local filesystem', e);
          }
        }
      }
    } else {
      console.log('★ [SUPABASE] Cloud database synchronized successfully or queue fallback completed.');
    }
  } catch (err) {
    console.warn('★ [SUPABASE-WRITE-WARNING] Failed background write upload:', err);
  }
}

/**
 * Helper to upload everything from db.json into Supabase tables (Seed & Sync).
 */
export async function forceSyncLocalToSupabase(env?: any, customDb?: any) {
  const client = getSupabaseClient(env);
  if (!client) {
    throw new Error('Supabase client is not initialized. Provide environment keys first.');
  }

  // Use customDb if provided (from KV/cache), otherwise read local db.json file
  const db = customDb || readLocalDb();
  if (!db) {
    throw new Error('Local db.json file is absent or corrupted.');
  }

  const logs: string[] = [];

  // First process sync queue if there is one
  if (db.sync_queue && db.sync_queue.length > 0) {
    logs.push('Processing pending sync queue first...');
    const syncRes = await processSyncQueue(db, env);
    logs.push(...syncRes.logs);
  }

  const syncTable = async (table: string, payload: any[]) => {
    if (!payload || payload.length === 0) {
      logs.push(`Table [${table}] — Nothing to sync (0 records).`);
      return;
    }
    try {
      const options: any = {};
      if (table === 'cost_config') {
        options.onConflict = 'project_id';
      } else if (table === 'ai_classifications') {
        options.onConflict = 'story_id,model_type';
      } else if (table === 'fpa_gsc_ratings') {
        options.onConflict = 'project_id,gsc_number';
      } else if (table === 'hybrid_scores') {
        options.onConflict = 'story_id,criterion_id';
      }

      let { error } = await client.from(table).upsert(payload, options);
      if (error && table === 'user_stories') {
        const isMissingColumn = error.message.includes('story_points') ||
          error.message.includes('column') ||
          error.code === '42703';
        if (isMissingColumn) {
          console.log(`★ [SUPABASE] Retrying sync on table [${table}] without story_points column...`);
          const strippedPayload = payload.map(({ story_points, ...rest }: any) => rest);
          const retryRes = await client.from(table).upsert(strippedPayload, options);
          error = retryRes.error;
        }
      }
      if (error && table === 'projects') {
        const isMissingColumn = error.message.includes('actual_cost') ||
          error.message.includes('actual_effort_days') ||
          error.message.includes('actual_duration_months') ||
          error.message.includes('column') ||
          error.code === '42703';
        if (isMissingColumn) {
          console.log(`★ [SUPABASE] Retrying sync on table [${table}] without actual metrics columns...`);
          const strippedPayload = payload.map(({ actual_cost, actual_effort_days, actual_duration_months, ...rest }: any) => rest);
          const retryRes = await client.from(table).upsert(strippedPayload, options);
          error = retryRes.error;
        }
      }
      if (error && table === 'cost_config') {
        const isMissingColumn = error.message.includes('fpa_productivity_rate') ||
          error.message.includes('cosmic_productivity_rate') ||
          error.message.includes('hybrid_productivity_rate') ||
          error.message.includes('column') ||
          error.code === '42703';
        if (isMissingColumn) {
          console.log(`★ [SUPABASE] Retrying sync on table [${table}] without specific productivity rate columns...`);
          const strippedPayload = payload.map(({ fpa_productivity_rate, cosmic_productivity_rate, hybrid_productivity_rate, ...rest }: any) => rest);
          const retryRes = await client.from(table).upsert(strippedPayload, options);
          error = retryRes.error;
        }
      }
      if (error) {
        logs.push(`Table [${table}] — ERROR syncing: ${error.message}`);
      } else {
        logs.push(`Table [${table}] — Successfully synced ${payload.length} records.`);
      }
    } catch (err: any) {
      logs.push(`Table [${table}] — Exception during sync: ${err.message || err}`);
    }
  };

  // 1. User profile
  if (db.user_profile) {
    const profileDb = mapUserProfileToDb(db.user_profile);
    if (profileDb) {
      // Create associated auth user if needed, or upsert profile
      await syncTable('user_profiles', [profileDb]);
    }
  }

  // 2. Projects
  const projectsDb = (db.projects || []).map(mapProjectToDb).filter(Boolean);
  await syncTable('projects', projectsDb);

  // 3. User Stories
  const storiesDb = (db.user_stories || []).map(mapUserStoryToDb).filter(Boolean);
  await syncTable('user_stories', storiesDb);

  // 4. Classifications
  const classifsDb = (db.ai_classifications || []).map(mapAiClassificationToDb).filter(Boolean);
  await syncTable('ai_classifications', classifsDb);

  // 5. Overrides
  const overridesDb = (db.ai_overrides || []).map(mapAiOverrideToDb).filter(Boolean);
  await syncTable('ai_overrides', overridesDb);

  // 6. FPA ratings
  const ratingsDb = (db.fpa_gsc_ratings || []).map(mapFpaGscRatingToDb).filter(Boolean);
  await syncTable('fpa_gsc_ratings', ratingsDb);

  // 7. Cosmic movements
  const movementsDb = (db.cosmic_movements || []).map(mapCosmicMovementToDb).filter(Boolean);
  await syncTable('cosmic_movements', movementsDb);

  // 8. Hybrid criteria
  const criteriaDb = (db.hybrid_criteria || []).map(mapHybridCriterionToDb).filter(Boolean);
  await syncTable('hybrid_criteria', criteriaDb);

  // 9. Hybrid scores
  const scoresDb = (db.hybrid_scores || []).map(mapHybridScoreToDb).filter(Boolean);
  await syncTable('hybrid_scores', scoresDb);

  // 10. Overheads
  const overheadsDb = (db.overheads || []).map(mapOverheadToDb).filter(Boolean);
  await syncTable('overheads', overheadsDb);

  // 11. Cost Configs
  const costConfigsDb = (db.cost_configs || []).map(mapCostConfigToDb).filter(Boolean);
  await syncTable('cost_config', costConfigsDb);

  // 12. System Config
  if (db.system_config) {
    const sysDb = mapSystemConfigToDb(db.system_config);
    if (sysDb) {
      await syncTable('system_config', [sysDb]);
    }
  }

  return { success: true, logs };
}