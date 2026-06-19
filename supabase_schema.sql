-- ==========================================================
-- SPEC-CLOUD.ESTIMATE — SUPABASE SCHEMA MIGRATION
-- Copy and run this script in your Supabase SQL Editor to
-- instantiate your production database tables.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users or stands alone as sandbox validation)
-- If you face foreign key issues during seeding/sync without active auth accounts,
-- you can change the "id" definition to simple "id UUID PRIMARY KEY" to remove dependencies on auth.users tracking.
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY, -- Can add REFERENCES auth.users if linking strictly to Supabase built-in Authentication
  full_name TEXT,
  organisation TEXT,
  role TEXT CHECK (role IN ('admin','estimator','viewer')) DEFAULT 'estimator',
  jira_config JSONB,
  azure_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client TEXT,
  description TEXT,
  version TEXT,
  project_type TEXT,
  estimator_id UUID REFERENCES user_profiles(id),
  status TEXT DEFAULT 'Draft',
  currency TEXT DEFAULT 'USD',
  team_size INTEGER DEFAULT 5,
  actual_cost NUMERIC(15,2),
  actual_effort_days NUMERIC(10,2),
  actual_duration_months NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Stories
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  story_id TEXT,
  role TEXT,
  goal TEXT,
  benefit TEXT,
  epic TEXT,
  module TEXT,
  priority TEXT DEFAULT 'Medium',
  source TEXT DEFAULT 'manual',
  raw_text TEXT,
  ai_status TEXT DEFAULT 'pending',
  tags TEXT,
  story_points INTEGER, -- Persists story size rating (e.g., Fibonacci points)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Classifications
CREATE TABLE IF NOT EXISTS ai_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES user_stories(id) ON DELETE CASCADE,
  model_type TEXT CHECK (model_type IN ('fpa','cosmic','hybrid')),
  classification JSONB,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  flags JSONB,
  ai_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, model_type)
);

-- AI Override Audit Trail
CREATE TABLE IF NOT EXISTS ai_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES user_stories(id),
  user_id UUID REFERENCES user_profiles(id),
  model_type TEXT,
  field_changed TEXT,
  original_value TEXT,
  override_value TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FPA GSC Ratings
CREATE TABLE IF NOT EXISTS fpa_gsc_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gsc_number INTEGER CHECK (gsc_number BETWEEN 1 AND 14),
  rating INTEGER CHECK (rating BETWEEN 0 AND 5) DEFAULT 0,
  UNIQUE(project_id, gsc_number)
);

-- COSMIC Data Movements
CREATE TABLE IF NOT EXISTS cosmic_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES user_stories(id) ON DELETE CASCADE,
  name TEXT,
  movement_type TEXT CHECK (movement_type IN ('Entry','Exit','Read','Write')),
  data_group TEXT,
  reasoning TEXT,
  is_ai_generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hybrid Criteria
CREATE TABLE IF NOT EXISTS hybrid_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score INTEGER DEFAULT 10,
  weight_percent NUMERIC(5,2),
  description TEXT,
  sort_order INTEGER
);

-- Hybrid Scores
CREATE TABLE IF NOT EXISTS hybrid_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES user_stories(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES hybrid_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5,2) DEFAULT 0,
  is_ai_suggested BOOLEAN DEFAULT TRUE,
  UNIQUE(story_id, criterion_id)
);

-- Overheads
CREATE TABLE IF NOT EXISTS overheads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  applies_to JSONB,
  method TEXT CHECK (method IN ('percentage','fixed')),
  value NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER
);

-- Cost Configuration
CREATE TABLE IF NOT EXISTS cost_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  fpa_cost_per_point NUMERIC(10,2) DEFAULT 500,
  cosmic_cost_per_point NUMERIC(10,2) DEFAULT 500,
  hybrid_cost_per_point NUMERIC(10,2) DEFAULT 500,
  productivity_rate NUMERIC(5,2) DEFAULT 1.5,
  working_days_per_month INTEGER DEFAULT 22,
  use_role_rates BOOLEAN DEFAULT FALSE,
  roles JSONB
);

-- Add missing columns if tables were auto-created without them
ALTER TABLE cost_config ADD COLUMN IF NOT EXISTS fpa_productivity_rate NUMERIC(5,2) DEFAULT 0.75;
ALTER TABLE cost_config ADD COLUMN IF NOT EXISTS cosmic_productivity_rate NUMERIC(5,2) DEFAULT 1.5;
ALTER TABLE cost_config ADD COLUMN IF NOT EXISTS hybrid_productivity_rate NUMERIC(5,2) DEFAULT 1.5;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimator_name TEXT DEFAULT 'Umesh Sharma';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS jira_config JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS azure_config JSONB;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS default_fpa_productivity_rate NUMERIC(5,2) DEFAULT 0.75;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS default_cosmic_productivity_rate NUMERIC(5,2) DEFAULT 1.5;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS default_hybrid_productivity_rate NUMERIC(5,2) DEFAULT 1.5;

-- System Configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_currency TEXT DEFAULT 'USD',
  default_productivity_rate NUMERIC(5,2) DEFAULT 1.5,
  default_fpa_cost_per_point NUMERIC(10,2) DEFAULT 500,
  default_cosmic_cost_per_point NUMERIC(10,2) DEFAULT 500,
  default_hybrid_cost_per_point NUMERIC(10,2) DEFAULT 500,
  ai_primary_provider TEXT DEFAULT 'cloudflare',
  cf_ai_model TEXT DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  groq_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  gemini_enabled BOOLEAN DEFAULT FALSE,
  ai_fallback_enabled BOOLEAN DEFAULT TRUE,
  jira_url TEXT,
  jira_project_key TEXT,
  azure_org_url TEXT,
  azure_project TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Usage Tracking (Cloudflare Workers AI)
CREATE TABLE IF NOT EXISTS cf_ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_date DATE DEFAULT CURRENT_DATE,
  neuron_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  UNIQUE(usage_date)
);

-- AI Usage Tracking (Groq)
CREATE TABLE IF NOT EXISTS groq_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_date DATE DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  UNIQUE(usage_date)
);

-- AI Usage Tracking (Gemini)
CREATE TABLE IF NOT EXISTS gemini_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_date DATE DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  UNIQUE(usage_date)
);

-- AI Error Log
CREATE TABLE IF NOT EXISTS ai_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES user_stories(id),
  provider TEXT,
  error_type TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Overhead Templates
CREATE TABLE IF NOT EXISTS overhead_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial System Settings (Generate a fixed UUID or simple UUID for default system_config)
INSERT INTO system_config (
  id,
  default_currency,
  default_productivity_rate,
  default_fpa_cost_per_point,
  default_cosmic_cost_per_point,
  default_hybrid_cost_per_point,
  ai_primary_provider,
  gemini_enabled,
  ai_fallback_enabled
) VALUES (
  'd0000000-0000-0000-0000-000000000000', 'USD', 1.5, 500, 500, 500, 'gemini', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- ROW LEVEL SECURITY
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpa_gsc_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmic_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hybrid_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE hybrid_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE overheads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE groq_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_usage ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- OPTION A: RUN THESE TO DISABLE RLS (RECOMMENDED FOR TESTING / SINGLE TENANT)
-- ==========================================================
-- If you want your database to act as an open data store during early evaluation 
-- and remove all "violates row-level security policy" synchronization blocks, 
-- please copy and execute this batch in your SQL Editor:
--
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_stories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_classifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_overrides DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fpa_gsc_ratings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cosmic_movements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE hybrid_criteria DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE hybrid_scores DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE overheads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cost_config DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cf_ai_usage DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE groq_usage DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE gemini_usage DISABLE ROW LEVEL SECURITY;


-- ==========================================================
-- OPTION B: CREATE PERMISSIVE DEVELOPMENT POLICIES (IF RLS IS ACTIVE)
-- ==========================================================
-- If you want to keep RLS active but grant allow-all rules for local / backend 
-- synchronization transactions across these tables:

-- 1. user_profiles Policy
CREATE POLICY IF NOT EXISTS "permissive_all_user_profiles" ON user_profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. projects Policy
CREATE POLICY IF NOT EXISTS "permissive_all_projects" ON projects FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. user_stories Policy
CREATE POLICY IF NOT EXISTS "permissive_all_user_stories" ON user_stories FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. ai_classifications Policy
CREATE POLICY IF NOT EXISTS "permissive_all_ai_classifications" ON ai_classifications FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. ai_overrides Policy
CREATE POLICY IF NOT EXISTS "permissive_all_ai_overrides" ON ai_overrides FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. fpa_gsc_ratings Policy
CREATE POLICY IF NOT EXISTS "permissive_all_fpa_gsc_ratings" ON fpa_gsc_ratings FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. cosmic_movements Policy
CREATE POLICY IF NOT EXISTS "permissive_all_cosmic_movements" ON cosmic_movements FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. hybrid_criteria Policy
CREATE POLICY IF NOT EXISTS "permissive_all_hybrid_criteria" ON hybrid_criteria FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. hybrid_scores Policy
CREATE POLICY IF NOT EXISTS "permissive_all_hybrid_scores" ON hybrid_scores FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. overheads Policy
CREATE POLICY IF NOT EXISTS "permissive_all_overheads" ON overheads FOR ALL TO public USING (true) WITH CHECK (true);

-- 11. cost_config Policy
CREATE POLICY IF NOT EXISTS "permissive_all_cost_config" ON cost_config FOR ALL TO public USING (true) WITH CHECK (true);

-- 12. system_config Policy
CREATE POLICY IF NOT EXISTS "permissive_all_system_config" ON system_config FOR ALL TO public USING (true) WITH CHECK (true);

-- 13. cf_ai_usage Policy
CREATE POLICY IF NOT EXISTS "permissive_all_cf_ai_usage" ON cf_ai_usage FOR ALL TO public USING (true) WITH CHECK (true);

-- 14. groq_usage Policy
CREATE POLICY IF NOT EXISTS "permissive_all_groq_usage" ON groq_usage FOR ALL TO public USING (true) WITH CHECK (true);

-- 15. gemini_usage Policy
CREATE POLICY IF NOT EXISTS "permissive_all_gemini_usage" ON gemini_usage FOR ALL TO public USING (true) WITH CHECK (true);

