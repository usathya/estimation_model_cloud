# Software Estimation Suite — Cloud Implementation Spec
> **Version:** 2.0 — Cloud Edition  
> **Date:** May 2026  
> **Status:** Ready for Implementation  
> **Target:** Gemini Code (VS Code Extension)  
> **Deployment:** Cloudflare Pages + Supabase  
> **AI Engine:** Cloudflare Workers AI → Groq → Gemini 2.0 Flash (all free, all cloud)

---

## How to Use This Spec with Gemini Code

1. Open VS Code with the Gemini Code extension installed
2. Create a new empty project folder
3. Start a Gemini Code session and say:
   > *"Implement the Software Estimation Suite according to SPEC-CLOUD.md. Start with Prompt 1 (Supabase schema), then Prompt 2 (React scaffold + auth), then Prompt 11 (test infrastructure). Then implement Prompts 3–10 in order."*
4. Attach this file

---

## Technology Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | React 18 + Tailwind CSS + Lucide Icons | Free |
| Hosting | Cloudflare Pages | Free (unlimited bandwidth) |
| AI Functions | Cloudflare Pages Functions (Workers) | Free tier |
| AI Primary | Cloudflare Workers AI (Llama 3.3 70B) | Free (10K neurons/day) |
| AI Fallback | Groq API (Llama 3.3 70B / DeepSeek R1) | Free (14,400 req/day) |
| AI Reserve | Google Gemini 2.0 Flash | Free (1,500 req/day) |
| Database | Supabase (PostgreSQL) | Free tier |
| Auth | Supabase Auth — Email + Google SSO + Microsoft SSO | Free |
| Charts | Recharts | Free |
| PDF Export | jsPDF + jspdf-autotable | Free |
| Excel Export | SheetJS (xlsx) | Free |
| Unit/Integration Tests | Vitest + React Testing Library + MSW 2.0 | Free |
| E2E Tests | Playwright | Free |
| Coverage | V8 via Vitest — minimum 90% enforced | Free |
| CI/CD | GitHub Actions | Free (2,000 min/month) |
| **Total Monthly Cost** | | **$0.00** |

---

## Design Tokens

| Token | Value |
|---|---|
| Font | Inter (Google Fonts) |
| Sidebar background | #0F172A (dark navy) |
| Content background | #FFFFFF (white) |
| Accent | #0D9488 (teal) |
| Warning | #F59E0B (amber) |
| Danger | #EF4444 (red) |
| Success | #10B981 (green) |

---

## User Roles & Access Control

| Feature | Admin | Estimator | Viewer |
|---|---|---|---|
| Create / edit projects | ✅ | ✅ | ❌ |
| Run AI analysis | ✅ | ✅ | ❌ |
| Override AI classifications | ✅ | ✅ | ❌ |
| Configure overheads & cost | ✅ | ✅ | ❌ |
| View summary & export | ✅ | ✅ | ✅ |
| Manage users & roles | ✅ | ❌ | ❌ |
| Configure AI engine & system | ✅ | ❌ | ❌ |
| View audit trail | ✅ | ✅ | ❌ |

---

## AI Engine Architecture

```
React App (Cloudflare Pages)
        │
        │ POST /api/analyse
        ▼
Cloudflare Pages Function (Worker)
        │  ← API keys stored here as Cloudflare Secrets
        │  ← Never exposed to browser
        │
        ├──▶ PRIMARY:  Cloudflare Workers AI
        │              Llama 3.3 70B / Qwen3 32B
        │              10,000 Neurons/day free
        │              Native binding — fastest, no HTTP
        │
        ├──▶ FALLBACK: Groq API
        │              Llama 3.3 70B / DeepSeek R1
        │              14,400 requests/day free
        │              World's fastest LLM inference (LPU)
        │
        └──▶ RESERVE:  Google Gemini 2.0 Flash
                       1,500 requests/day free
                       Native JSON schema enforcement
```

---

## Database Schema (14 Tables)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  organisation TEXT,
  role TEXT CHECK (role IN ('admin','estimator','viewer')) DEFAULT 'estimator',
  jira_config JSONB,
  azure_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Stories
CREATE TABLE user_stories (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Classifications
CREATE TABLE ai_classifications (
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
CREATE TABLE ai_overrides (
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
CREATE TABLE fpa_gsc_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gsc_number INTEGER CHECK (gsc_number BETWEEN 1 AND 14),
  rating INTEGER CHECK (rating BETWEEN 0 AND 5) DEFAULT 0,
  UNIQUE(project_id, gsc_number)
);

-- COSMIC Data Movements
CREATE TABLE cosmic_movements (
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
CREATE TABLE hybrid_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score INTEGER DEFAULT 10,
  weight_percent NUMERIC(5,2),
  description TEXT,
  sort_order INTEGER
);

-- Hybrid Scores
CREATE TABLE hybrid_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES user_stories(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES hybrid_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5,2) DEFAULT 0,
  is_ai_suggested BOOLEAN DEFAULT TRUE,
  UNIQUE(story_id, criterion_id)
);

-- Overheads
CREATE TABLE overheads (
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
CREATE TABLE cost_config (
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

-- System Configuration
CREATE TABLE system_config (
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
CREATE TABLE cf_ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_date DATE DEFAULT CURRENT_DATE,
  neuron_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  UNIQUE(usage_date)
);

-- AI Usage Tracking (Groq)
CREATE TABLE groq_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_date DATE DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  UNIQUE(usage_date)
);

-- AI Usage Tracking (Gemini)
CREATE TABLE gemini_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_date DATE DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  UNIQUE(usage_date)
);

-- AI Error Log
CREATE TABLE ai_errors (
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
CREATE TABLE overhead_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
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

-- RLS Policies (implement for each table):
-- Viewers:    SELECT only
-- Estimators: SELECT + INSERT + UPDATE on project/estimation tables
-- Admins:     Full access including user_profiles, system_config
-- Use: auth.uid() joined to user_profiles.role for all checks
```

---

## Cloudflare Environment Secrets

Set in Cloudflare Pages → Settings → Environment Variables:

```
SUPABASE_URL          = https://your-project.supabase.co
SUPABASE_SERVICE_KEY  = your-supabase-service-role-key  (server-side only)
GROQ_API_KEY          = from console.groq.com/keys
GEMINI_API_KEY        = from aistudio.google.com (optional)
```

React app `.env.local` (client-side only — safe values):
```
REACT_APP_SUPABASE_URL      = https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY = your-supabase-anon-key
```

Note: AI API keys NEVER go in React env vars. They live only in
the Cloudflare Worker environment (server-side).

---

## Folder Structure

```
software-estimation-suite/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   ├── layout/           ← Sidebar, TopBar, Navigation
│   │   ├── project/          ← ProjectSetup, ProjectList
│   │   ├── stories/          ← StoryTable, StoryForm, FileUpload
│   │   │   └── integrations/ ← JiraConnector, AzureConnector
│   │   ├── ai/               ← AnalysisPanel, ConfidencePanel, OverrideModal
│   │   ├── fpa/              ← FpaTab, IlfEifTable, TransactionalTable, VafPanel
│   │   ├── cosmic/           ← CosmicTab, ProcessCard, MovementTable
│   │   ├── hybrid/           ← HybridTab, CriteriaBuilder, ScoringGrid
│   │   ├── overheads/        ← OverheadsTab, OverheadTable, CostCards
│   │   ├── summary/          ← SummaryTab, ModelTable, ExportButtons
│   │   └── admin/            ← AdminPanel, UserManagement, AiConfig
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ProjectContext.tsx
│   ├── hooks/
│   │   ├── useSupabase.ts
│   │   ├── useAiAnalysis.ts
│   │   ├── useFpaCalculations.ts
│   │   ├── useCosmicCalculations.ts
│   │   └── useHybridCalculations.ts
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── engines/
│   │   │   ├── fpaEngine.ts
│   │   │   ├── cosmicEngine.ts
│   │   │   ├── hybridEngine.ts
│   │   │   ├── overheadEngine.ts
│   │   │   └── costEngine.ts
│   │   └── exporters/
│   │       ├── pdfExporter.ts
│   │       └── excelExporter.ts
│   ├── types/
│   │   └── index.ts
│   ├── __tests__/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── mocks/
│   │   └── utils/
│   └── e2e/
├── functions/
│   └── api/
│       └── analyse.ts        ← Cloudflare Pages Function (AI proxy Worker)
├── wrangler.toml             ← Cloudflare configuration
├── playwright.config.ts
├── vitest.config.ts
└── .env.example
```

---

# PROMPT 1 — Supabase Setup & React Scaffold

```
Set up the complete project foundation for the Software Estimation Suite
(Cloud Edition).

STEP 1 — Initialize React project:
  npx create-react-app software-estimation-suite --template typescript
  cd software-estimation-suite

STEP 2 — Install all dependencies:
  npm install @supabase/supabase-js @supabase/auth-ui-react
              @supabase/auth-ui-shared recharts jspdf
              jspdf-autotable xlsx lucide-react react-router-dom
              @types/react-router-dom

STEP 3 — Create wrangler.toml (Cloudflare configuration):
  name = "software-estimation-suite"
  compatibility_date = "2024-01-01"

  [[ai]]
  binding = "AI"

  [vars]
  ENVIRONMENT = "production"

STEP 4 — Create src/lib/supabaseClient.ts:
  import { createClient } from '@supabase/supabase-js'
  export const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL!,
    process.env.REACT_APP_SUPABASE_ANON_KEY!
  )

STEP 5 — Run the complete database schema in Supabase SQL editor
  (all 14 tables + RLS as defined in schema section above).

STEP 6 — Create all TypeScript interfaces in src/types/index.ts:
  Interfaces for: Project, UserProfile, UserStory, AiClassification,
  AiOverride, FpaGscRating, CosmicMovement, HybridCriterion,
  HybridScore, Overhead, CostConfig, SystemConfig, FpaResult,
  CosmicResult, HybridResult, SummaryMetrics, AiProvider

STEP 7 — Create AuthContext (src/context/AuthContext.tsx):
  Provides: { user, profile, role, signOut,
              isAdmin, isEstimator, isViewer, loading }
  On mount: subscribe to supabase.auth.onAuthStateChange
  On login: fetch user_profile, create with role='estimator' if not exists

STEP 8 — Create ProjectContext (src/context/ProjectContext.tsx):
  Provides: { currentProject, setCurrentProject,
              loadProject, saveProject, projects, refreshProjects }
  loadProject(id): fetches project + all related data in Promise.all()

STEP 9 — App routing (src/App.tsx):
  / → redirect to /login or /dashboard
  /login → LoginPage
  /dashboard → MainLayout with 7-tab sidebar
  /admin → AdminPanel (admin guard)

STEP 10 — LoginPage:
  Use @supabase/auth-ui-react Auth component
  Providers: ['google', 'azure']
  Custom navy/teal theme
  Title: "Software Estimation Suite"
  Subtitle: "Contact your administrator to request access"

STEP 11 — MainLayout:
  Left sidebar (240px, #0F172A):
    - App logo + "Estimation Suite" title
    - User avatar + full_name + role badge
    - 7 navigation steps with status pills:
        1. Project Setup
        2. User Stories
        3. Function Point Analysis
        4. COSMIC Function Points
        5. Hybrid Model
        6. Overheads & Cost
        7. Summary
    - Status pills: grey=empty, amber=partial, green=complete
    - [Admin Panel] link — admin only
    - [Sign Out] at bottom

  Top bar (64px, white):
    - Current project name (click to rename)
    - Last saved timestamp (from projects.updated_at)
    - [New Project] [Load Project] [Save] buttons
    - AI provider badge: shows active provider + status
      (CF Workers AI green / Groq blue / Gemini purple)
    - Online users presence avatars
    - "Saved ✓" fading indicator

  Content area: renders active tab component
```

---

# PROMPT 2 — Project Setup Screen

```
Build the Project Setup tab (Tab 1).

PROJECT FORM:
  - Project Name* (required)
  - Client Name
  - Description (textarea)
  - Version (e.g. "1.0")
  - Project Date (date picker)
  - Project Type* (Web App / Enterprise-ERP / Mobile App /
    Embedded-Realtime / Mixed)
  - Estimator (auto: logged-in user, read-only)
  - Status (Draft / Under Review / Approved)
  - Currency* (USD / EUR / GBP / SAR / AED / Other)
  - Team Size* (number, min 1)

On [Save]: supabase.from('projects').upsert({...})
Show "Saved ✓" in top bar. Show error toast on failure.

COST CONFIGURATION PANEL:
Collapsible card below project form.

Level 1 — Model Rates:
  FPA Cost per Point ($) | COSMIC Cost per Point ($) | Hybrid Cost per Point ($)
  Defaults loaded from system_config

Level 2 — Productivity:
  Function Points per person-day (default 1.5)
  Working days per month (default 22)

Level 3 — Role-based Rates (toggle):
  [Use Role-based Rates] toggle
  When on: table of roles — Name | Daily Rate ($) | Allocation (%)
  Live validation: "Total: XX% — must equal 100%"

On change: supabase.from('cost_config').upsert({project_id, ...})
Debounce saves 800ms.

LOAD PROJECT MODAL:
  supabase.from('projects').select('*, user_profiles(full_name)')
          .order('updated_at', ascending: false)
  Shows: Name | Client | Type | Status | Last Updated | Estimator
  Actions: [Load] [Duplicate] [Delete (admin only)]

REAL-TIME:
  Subscribe to project changes. Show update banner if another
  user edits the same project simultaneously.
```

---

# PROMPT 3 — User Story Ingestion

```
Build the User Stories tab (Tab 2).

LAYOUT:
  Top: 4 ingestion sub-tabs
  Bottom: Master Story List (always visible)

SUB-TAB A — Manual / Free Text:
  Large textarea for free-text paste
  Structured form: Story ID (auto) | Role | Goal | Benefit |
                   Epic | Priority | Tags
  [Add Story] → supabase.from('user_stories').insert({...})

SUB-TAB B — File Upload:
  Drag-drop zone: .xlsx, .csv, .txt, .docx
  Excel/CSV: column mapping step before import
  .txt/.docx: send to AI for story extraction (calls /api/analyse
              with mode='extract' to parse stories from document)
  Bulk insert: supabase.from('user_stories').insert(storiesArray)
  Progress bar during import

SUB-TAB C — Jira Integration:
  Fields: Jira URL | Project Key | API Token (saved in user_profiles)
  [Connect & Fetch] → GET {url}/rest/api/2/search?jql=project={key}
  Maps: summary→goal, description→benefit, key→story_id,
        priority→priority, components[0]→epic
  source='jira' stored on each row
  JSON fallback for CORS environments

SUB-TAB D — Azure DevOps Integration:
  Fields: Org URL | Project Name | PAT Token
  [Connect & Fetch] → POST /_apis/wit/wiql
  Maps equivalent fields, source='azure'
  JSON fallback

MASTER STORY LIST:
  Columns: # | Story ID | Role | Goal | Epic | Priority |
           Source | AI Status | Actions
  Priority badges: Red=High, Amber=Medium, Green=Low
  Source badges: Blue=manual, Purple=file, Orange=jira, Teal=azure
  AI Status: Grey=Pending, Amber spinner=Analysing,
             Green=Classified (XX%), Blue=Overridden, Red=Flagged
  Actions: [Analyse ▶] [Edit ✎] [Delete ✕]
  Top: [+ Add Story] [Analyse All ▶▶] [Clear All] [Export CSV]
  Count bar: Total: X | Pending: X | Classified: X | Overridden: X | Flagged: X

Real-time: subscribe to user_stories table changes
```

---

# PROMPT 4 — AI Analysis Engine (Cloud, All-Free)

```
Build the AI Analysis Engine for the Software Estimation Suite.
All AI calls are made from a Cloudflare Pages Function (server-side).
No AI keys are ever exposed to the React frontend.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLOUDFLARE PAGES FUNCTION — AI PROXY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create functions/api/analyse.ts:
This is a Cloudflare Pages Function co-deployed with the React app.

export async function onRequestPost(context) {
  const { storyId, storyText, projectType, mode } = await context.request.json()
  const env = context.env

  // Select provider based on daily usage
  const provider = await selectProvider(env)

  // Build prompts
  const { systemPrompt, userPrompt } = buildPrompts(storyText, projectType, mode)

  // Call selected provider
  let result
  if (provider === 'cloudflare') {
    result = await callCloudflareAI(env, systemPrompt, userPrompt)
  } else if (provider === 'groq') {
    result = await callGroq(env, systemPrompt, userPrompt)
  } else if (provider === 'gemini') {
    result = await callGemini(env, systemPrompt, userPrompt)
  }

  // Update usage counter in Supabase
  await trackUsage(env, provider)

  return new Response(JSON.stringify({
    classification: result,
    provider: provider
  }), { headers: { 'Content-Type': 'application/json' } })
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROVIDER 1 — CLOUDFLARE WORKERS AI (Primary)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Free: 10,000 Neurons/day. Native binding — no HTTP call needed.
Each classification uses ~200-400 Neurons (25-50 per day free).

async function callCloudflareAI(env, systemPrompt, userPrompt) {
  const response = await env.AI.run(
    env.CF_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1500
    }
  )
  return JSON.parse(response.response)
}

Available CF AI models (Admin-configurable):
  @cf/meta/llama-3.3-70b-instruct-fp8-fast  ← default, best quality
  @cf/meta/llama-3.1-8b-instruct            ← lighter, more req/day
  @cf/qwen/qwen2.5-72b-instruct             ← alternative quality
  @cf/deepseek-ai/deepseek-r1-distill-qwen-32b ← reasoning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROVIDER 2 — GROQ API (Fallback)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Free: 14,400 requests/day, 30 RPM. No credit card.
World's fastest inference (LPU chips, 300-1000 tokens/sec).
OpenAI-compatible API.

async function callGroq(env, systemPrompt, userPrompt) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      })
    }
  )
  if (response.status === 429) {
    // Wait 2s and retry once
    await new Promise(r => setTimeout(r, 2000))
    return callGroq(env, systemPrompt, userPrompt)
  }
  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

Available Groq models (Admin-configurable):
  llama-3.3-70b-versatile   ← default, GPT-4o quality
  llama-3.1-8b-instant      ← fastest, lighter
  deepseek-r1-distill-70b   ← deep reasoning
  qwen-qwq-32b              ← strong reasoning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROVIDER 3 — GOOGLE GEMINI 2.0 FLASH (Reserve)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Free: 1,500 requests/day, 15 RPM. No credit card.
Native JSON schema enforcement via responseSchema parameter.
Admin enables this as optional reserve layer.

async function callGemini(env, systemPrompt, userPrompt) {
  const fullPrompt = systemPrompt + "\n\n" + userPrompt
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: JSON_SCHEMA,
          temperature: 0.1
        }
      })
    }
  )
  const data = await response.json()
  return JSON.parse(data.candidates[0].content.parts[0].text)
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROVIDER SELECTION LOGIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function selectProvider(env):
  1. Fetch today's usage from Supabase (cf_ai_usage, groq_usage, gemini_usage)
  2. If CF neurons today < 8,000 AND primary = 'cloudflare':
       return 'cloudflare'
  3. Else if Groq requests today < 12,000:
       return 'groq'
  4. Else if Gemini enabled AND Gemini requests today < 1,400:
       return 'gemini'
  5. Else: throw Error('Daily AI capacity reached. Resets midnight UTC.')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM PROMPT (all providers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"You are an expert software estimation consultant trained in IFPUG
Function Point Analysis (FPA), COSMIC Function Points, and hybrid
weighted estimation models. Analyse user stories and classify them
for software estimation. Respond ONLY with valid JSON matching the
exact schema. Be precise and conservative. Flag ambiguities."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROMPT TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Analyse this user story for software estimation:

Story ID: {storyId}
Story: {storyText}
Project Type: {projectType}

For FPA: classify as ILF, EIF, EI, EO, or EQ. Estimate RETs and
DETs for data functions, FTRs and DETs for transactional functions.

For COSMIC: identify the functional process and all data movements
(Entry, Exit, Read, Write) with their data groups.

For Hybrid: score all 4 complexity dimensions 0-10.

Return JSON matching the schema exactly."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSON SCHEMA (enforced by all providers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "type": "object",
  "properties": {
    "fpa": {
      "type": "object",
      "properties": {
        "functionType": { "type": "string",
          "enum": ["ILF","EIF","EI","EO","EQ"] },
        "complexity": { "type": "string",
          "enum": ["Low","Average","High"] },
        "rets": { "type": "integer", "minimum": 0 },
        "dets": { "type": "integer", "minimum": 0 },
        "ftrs": { "type": "integer", "minimum": 0 },
        "unadjustedFP": { "type": "integer" },
        "reasoning": { "type": "string" },
        "confidence": { "type": "integer",
          "minimum": 0, "maximum": 100 }
      },
      "required": ["functionType","complexity","rets","dets",
                   "ftrs","unadjustedFP","reasoning","confidence"]
    },
    "cosmic": {
      "type": "object",
      "properties": {
        "functionalProcess": { "type": "string" },
        "dataMovements": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "type": { "type": "string",
                "enum": ["Entry","Exit","Read","Write"] },
              "dataGroup": { "type": "string" },
              "reasoning": { "type": "string" }
            },
            "required": ["name","type","dataGroup","reasoning"]
          }
        },
        "cfp": { "type": "integer" },
        "reasoning": { "type": "string" },
        "confidence": { "type": "integer",
          "minimum": 0, "maximum": 100 }
      },
      "required": ["functionalProcess","dataMovements",
                   "cfp","reasoning","confidence"]
    },
    "hybrid": {
      "type": "object",
      "properties": {
        "complexity": { "type": "string",
          "enum": ["Low","Medium","High","Very High"] },
        "suggestedWeightScore": { "type": "number",
          "minimum": 0, "maximum": 100 },
        "dimensions": {
          "type": "object",
          "properties": {
            "uiComplexity":    { "type": "number", "minimum": 0, "maximum": 10 },
            "integrationRisk": { "type": "number", "minimum": 0, "maximum": 10 },
            "dataVolume":      { "type": "number", "minimum": 0, "maximum": 10 },
            "businessLogic":   { "type": "number", "minimum": 0, "maximum": 10 }
          },
          "required": ["uiComplexity","integrationRisk",
                       "dataVolume","businessLogic"]
        },
        "reasoning": { "type": "string" },
        "confidence": { "type": "integer",
          "minimum": 0, "maximum": 100 }
      },
      "required": ["complexity","suggestedWeightScore","dimensions",
                   "reasoning","confidence"]
    },
    "overallConfidence": { "type": "integer",
      "minimum": 0, "maximum": 100 },
    "flags": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["fpa","cosmic","hybrid","overallConfidence","flags"]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS FLOW (React side)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function analyseStory(storyId):
  1. Update story ai_status = 'analysing' in Supabase
  2. POST /api/analyse { storyId, storyText, projectType }
  3. Save FPA → ai_classifications (model_type='fpa')
  4. Save COSMIC → ai_classifications (model_type='cosmic')
  5. Save COSMIC movements → cosmic_movements
  6. Save Hybrid → ai_classifications (model_type='hybrid')
  7. Save Hybrid scores → hybrid_scores
  8. Update story ai_status = 'classified' or 'flagged'
  9. On error → log to ai_errors, status = 'pending'

async function analyseAllStories(projectId, onProgress):
  Process sequentially with for...of loop
  200ms delay between requests to respect rate limits
  Call onProgress({ current, total, classified, flagged, failed })

OVERRIDE WITH AUDIT TRAIL:
  On save override:
    1. Update ai_classifications with new values
    2. Insert to ai_overrides (story_id, user_id, model_type,
       field_changed, original_value, override_value, reason)
    3. Update story ai_status = 'overridden'

ERROR HANDLING:
  JSON parse error    → retry once with stricter prompt
  429 rate limit      → wait 60s, retry, then queue
  Timeout (>30s)      → mark pending, show [Retry] button
  All providers busy  → show "Daily limit reached. Resets midnight UTC."
  All errors          → log to ai_errors table
```

---

# PROMPT 5 — Function Point Analysis Tab

```
Build the FPA tab (Tab 3). Auto-populated from AI classifications.
(Full IFPUG standard — 5 function types, 14 GSCs, UFP → VAF → AFP)

SECTION A — Data Functions (ILF / EIF):
Load AI-classified ILF and EIF stories.
Editable inline: RETs, DETs → auto-recalculate complexity + UFP.

IFPUG ILF Matrix: 1RET/1-19DET=Low(7), 1RET/20+DET=Avg(10),
  2-5RET/1-19DET=Avg(10), 2-5RET/20+DET=High(15), 6+RET/any=High(15)
IFPUG EIF Matrix: Same thresholds → Low=5, Avg=7, High=10

SECTION B — Transactional Functions (EI / EO / EQ):
Editable inline: FTRs, DETs → auto-recalculate.

IFPUG EI:  0-1FTR/1-4DET=Low(3), 0-1FTR/5+DET=Avg(4),
           2+FTR/1-4DET=Avg(4), 2+FTR/5+DET=High(6)
IFPUG EO:  0-1FTR/1-5DET=Low(4), 0-1FTR/6+DET=Avg(5),
           2+FTR/1-19DET=Avg(5), 2+FTR/20+DET=High(7)
IFPUG EQ:  0-1FTR/1-5DET=Low(3), mid=Avg(4), high=High(6)

SECTION C — UFP Summary Table:
| Type | Low (n×pts) | Avg (n×pts) | High (n×pts) | Subtotal |
Grand total row. Stacked bar chart by function type.

Save inline edits: supabase.from('ai_classifications')
  .update({ classification: updated }).eq('id', id) — debounce 500ms

SECTION D — VAF (14 GSCs):
Sliders 0–5 with name + description tooltip for each of 14 GSCs:
  1.Data Communications  2.Distributed Data Processing
  3.Performance  4.Heavily Used Configuration
  5.Transaction Rate  6.Online Data Entry
  7.End-User Efficiency  8.Online Update
  9.Complex Processing  10.Reusability
  11.Installation Ease  12.Operational Ease
  13.Multiple Sites  14.Facilitate Change

Live: TDI = sum of 14 ratings
      VAF = 0.65 + (TDI × 0.01)    [range 0.65–1.35]
      AFP = UFP × VAF

Save: supabase.from('fpa_gsc_ratings').upsert({project_id, gsc_number, rating})
Debounce 500ms.

FPA RESULTS BOX: UFP | TDI | VAF | AFP

FPA COST SUMMARY:
  Cost = AFP × fpa_cost_per_point
  Effort = AFP ÷ productivity_rate (person-days)
  Duration = Effort ÷ team_size ÷ working_days_per_month (months)

Viewer: all inputs disabled, read-only.
```

---

# PROMPT 6 — COSMIC Function Points Tab

```
Build the COSMIC tab (Tab 4). Auto-populated from AI classifications.

GUIDANCE PANEL (collapsible):
  "1 data movement = 1 CFP regardless of complexity.
   Entry: data INTO process. Exit: data OUT of process.
   Read: data FROM storage. Write: data TO storage.
   Minimum 2 movements per functional process."

PROCESS CARDS (one per AI-classified story):
  Header: Story ID | Goal | Process Name | CFP badge | Confidence | [▼]
  Body (expanded):
    Movements table: # | Name | Type | Data Group | Source | [Delete]
    Type color-coded: Entry=blue, Exit=green, Read=amber, Write=red
    AI-generated rows show "AI" badge. Manual rows show "Manual".
    Quick-add: [+Entry] [+Exit] [+Read] [+Write]

  Add: supabase.from('cosmic_movements').insert({story_id,...})
  Delete: supabase.from('cosmic_movements').delete().eq('id',id)

STANDALONE PROCESSES:
  [+ Add standalone process] for COSMIC scope beyond story list.

SUMMARY TABLE:
  | Process | Story ID | E | X | R | W | CFP |
  Grand totals row.

VISUALS: Donut (E/X/R/W distribution) + Bar (CFP per process)

COSMIC COST SUMMARY:
  Cost = Grand CFP × cosmic_cost_per_point
  Effort = Grand CFP ÷ productivity_rate
  Duration = Effort ÷ team_size ÷ working_days_per_month
```

---

# PROMPT 7 — Hybrid Model Tab

```
Build the Hybrid Model tab (Tab 5). Weighted custom criteria.

PART A — Criteria Definition:
Table: # | Name | Description | Max Score | Weight % | [Delete]
All cells editable inline.
Live validation: "Total Weight: XX%" — green if 100%, red if not.

[+ Add Criterion] [Load Template ▾]

Templates:
  "Web App": UI Complexity 30% | Integration Risk 25% |
             Data Volume 20% | Business Logic 25%
  "Enterprise/ERP": Integration 35% | Data Complexity 30% |
                    Workflow 20% | UI 15%
  "Mobile App": UI/UX 35% | API Integration 30% |
                Offline/Sync 20% | Performance 15%

Save: supabase.from('hybrid_criteria').upsert({project_id,...})

PART B — AI-Suggested Scoring Grid:
Grid: rows=stories, columns=criteria
AI pre-fills cells by mapping hybrid dimensions to criteria names.
Changed cells: amber highlight. AI cells: blue tint + "AI" badge.

Per row:
  Weighted Score = Σ(score/maxScore × weight%) × 100
  Score bar + Complexity badge:
    0-25=Low(green) | 26-50=Medium(blue) |
    51-75=High(amber) | 76-100=Very High(red)

Save: supabase.from('hybrid_scores')
      .upsert({story_id, criterion_id, score, is_ai_suggested: false})
Debounce 300ms.

PART C — Hybrid Points Summary:
  Total Weighted FP = Σ all row scores
  Normalization Factor (editable, default 1.0)
  Normalized Hybrid Points = Total × factor
  Bar chart: stories ranked by weighted score

HYBRID COST SUMMARY:
  Cost = Normalized Points × hybrid_cost_per_point
  Effort = Normalized Points ÷ productivity_rate
  Duration = Effort ÷ team_size ÷ working_days_per_month
```

---

# PROMPT 8 — Overheads & Cost Tab

```
Build the Overheads & Cost tab (Tab 6).

PRE-LOADED SUGGESTIONS (dismissible on first visit):
  PM 10% | Testing 15% | Documentation 8% |
  Deployment 5% | Contingency 10% — all models

OVERHEAD TABLE:
  # | Name | Applies To [FPA][COSMIC][HYBRID] toggles |
    Method (% or fixed) | Value | Active toggle | [Delete]

[+ Add Overhead] [Save as Template] [Load Template]
Drag to reorder (updates sort_order).

CRUD:
  Add:    supabase.from('overheads').insert({project_id,...})
  Update: supabase.from('overheads').update({...}).eq('id',id)
  Delete: supabase.from('overheads').delete().eq('id',id)

POINTS IMPACT TABLE:
  Per model: | Overhead Name | Applies? | Base Pts | OH Pts | Total |
  Grand total per model.

COST & RESOURCE CARDS (3 cards, one per model):
  ┌────────────────────────────────────┐
  │ [MODEL NAME]                       │
  │ Base Points:        XXX            │
  │ Overhead Points:    XXX            │
  │ Total Points:       XXX            │
  │ ─────────────────────────────────  │
  │ Cost per Point:     $XXX           │
  │ Estimated Cost:     $X,XXX,XXX     │
  │ ─────────────────────────────────  │
  │ Effort:             XXX days       │
  │ Duration:           X.X months     │
  │ ─────────────────────────────────  │
  │ Role Breakdown (if enabled):       │
  │   Developer  XX days  $XX,XXX      │
  │   Tester     XX days  $XX,XXX      │
  │   PM         XX days  $XX,XXX      │
  └────────────────────────────────────┘

All calculations in React — no computed values stored in DB.
```

---

# PROMPT 9 — Summary Dashboard & Export

```
Build the Summary tab (Tab 7). Stakeholder-facing, print-ready.

SECTION A — Project Header:
  Name | Client | Date | Version | Estimator | Status | Type | Currency
  "AI Engine Used: Cloudflare Workers AI (Llama 3.3 70B)" or active provider

SECTION B — Model Comparison Table:
  | Model | Base Pts | Overhead | Total Pts | Effort | Cost | Duration |
  | FPA   |          |          |           |        |      |          |
  | COSMIC|          |          |           |        |      |          |
  | Hybrid|          |          |           |        |      |          |
  | AVG   |  avg     |  avg     |   avg     |  avg   | avg  |  avg     |

  AVERAGE row: teal background, bold.
  Confidence band: Low (−10%) | Point Estimate | High (+10%)

SECTION C — Charts (2×2 grid):
  1. Grouped bar: Base vs Total per model
  2. Stacked bar: overhead breakdown per model
  3. Donut: proportion of each model in average
  4. Gauge: overall AI confidence (avg of all story confidences)

SECTION D — Story-level Summary (collapsible):
  Story ID | Goal | FP Type | UFP | CFP | Hybrid Score | Confidence | Status
  Sortable, paginated 25/page.

SECTION E — Overhead Summary (collapsible):
  Name | Method | Value | FPA Impact | COSMIC Impact | Hybrid Impact

SECTION F — Audit Trail Summary:
  Total | Classified | Overridden | Flagged counts
  [View Full Audit Trail] link

SECTION G — Export:
[Export PDF] — 8-page PDF via jsPDF + jspdf-autotable:
  P1: Cover (name, client, date, logo placeholder)
  P2: Executive Summary (model table + confidence band)
  P3: FPA Detail (UFP table, GSC ratings, AFP)
  P4: COSMIC Detail (process table, movements)
  P5: Hybrid Detail (criteria, scoring grid)
  P6: Overheads & Cost (breakdown per model + roles)
  P7: Story List (all stories with classifications)
  P8: Audit Trail (all overrides with reasons)

[Export Excel] — .xlsx via SheetJS, 7 sheets:
  Summary | FPA | COSMIC | Hybrid | Overheads | Stories | Audit Trail
  Headers formatted, columns auto-width, numbers formatted.

[Export CSV] — flat CSV of summary table only.

@media print: hide sidebar, top bar, export buttons. Full width.
```

---

# PROMPT 10 — Admin Panel

```
Build the Admin Panel. Route: /admin (admin role guard).

SECTION 1 — User Management:
  Table: Name | Email | Role | Joined | Actions
  Actions: Role dropdown (Admin/Estimator/Viewer) | [Resend Invite] | [Deactivate]
  [+ Invite User] → supabase.auth.admin.inviteUserByEmail(email)

SECTION 2 — AI Engine Configuration:
  Primary Provider: radio
    ◉ Cloudflare Workers AI (recommended)
    ○ Groq
    ○ Gemini 2.0 Flash

  Cloudflare Workers AI:
    Model dropdown: Llama 3.3 70B / Qwen3 32B / Llama 3.1 8B / DeepSeek R1
    Today's Neurons: [████░░░░░░] X,XXX / 10,000
    Warning threshold: 8,000 neurons (amber banner)
    [Test Connection] → test classification + latency display

  Groq:
    API key set via Cloudflare dashboard (not shown here)
    Model dropdown: Llama 3.3 70B / Llama 3.1 8B / DeepSeek R1 / QwQ 32B
    Today's requests: [████░░░░░░] X,XXX / 14,400
    Warning threshold: 12,000 requests (amber banner)
    [Test Connection]

  Gemini 2.0 Flash (optional reserve):
    API key set via Cloudflare dashboard
    Today's requests: [█░░░░░░░░░] XXX / 1,500
    Toggle: [Enable as reserve provider]
    [Test Connection]

  Fallback chain display:
    CF Workers AI → Groq → Gemini → ⛔ Daily limit reached

  Save: supabase.from('system_config').upsert({...})

SECTION 3 — System Defaults:
  Currency | Productivity Rate | Cost per Point (FPA/COSMIC/Hybrid)
  Saved to system_config. New projects inherit these.

SECTION 4 — Integration Settings:
  Org-wide Jira URL + project key
  Org-wide Azure DevOps URL + project name
  [Test Connection] per integration

SECTION 5 — Overhead Templates:
  View/create/edit/delete org-wide overhead templates.

SECTION 6 — Usage Analytics:
  Stat cards: Projects | Stories | AI Analyses | Avg Confidence
  Bar chart: analyses per day (last 30 days)
  Table: most active estimators

SECTION 7 — Audit Log:
  Org-wide override history. Filterable by user/date/model/project.
  [Export Excel] button.
```

---

# PROMPT 11 — Test Infrastructure & Complete Test Suite

```
Add a comprehensive 3-layer test suite. Minimum 90% coverage enforced.
Set up test infrastructure BEFORE building features (TDD).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Install:
  npm install -D vitest @vitest/coverage-v8 @vitest/ui
              @testing-library/react @testing-library/user-event
              @testing-library/jest-dom msw playwright @playwright/test

vitest.config.ts:
  globals: true, environment: jsdom
  coverage: v8, thresholds all 90%
  exclude: node_modules, e2e, mocks, types

playwright.config.ts:
  baseURL: localhost:3000
  browsers: chromium, firefox, webkit
  screenshot on failure, video on retry

src/__tests__/setup.ts:
  import '@testing-library/jest-dom'
  MSW server: listen before all, reset after each, close after all

npm scripts:
  "test":          "vitest"
  "test:coverage": "vitest run --coverage"
  "test:e2e":      "playwright test"
  "test:all":      "vitest run --coverage && playwright test"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — MSW MOCK HANDLERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handlers.ts (MSW 2.0):
  Supabase REST: GET/POST/PATCH/DELETE for all 14 tables
  Auth: /auth/v1/token, /auth/v1/signup, /auth/v1/logout
  AI Proxy (/api/analyse):
    → mockHighConfidenceClassification (confidence: 92, no flags)
    → mockLowConfidenceClassification (confidence: 45)
    → mockFlaggedClassification (flags: ["Ambiguous scope"])
    → mockAiErrorResponse (status: 500)
    → mockRateLimitResponse (status: 429)
    → provider field: 'cloudflare' | 'groq' | 'gemini'
  Jira: GET mock-jira.atlassian.net → 5 mock stories
  Azure: POST mock-dev.azure.com → 5 mock work items

Fixtures:
  projects.ts: webAppProject, erpProject, mobileProject
  stories.ts: 15 stories covering ILF/EIF/EI/EO/EQ + processes
  classifications.ts: pre-classified results for all 15 stories
  overheads.ts: PM 10%, Testing 15%, Docs 8%, Contingency 10%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — UNIT TESTS (~85 tests)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

fpaEngine.test.ts:
  All 9 boundary conditions for each of 5 IFPUG matrices
  UFP summation across mixed types
  VAF: 0.65 (all zeros), 1.35 (all fives), formula correctness
  AFP = UFP × VAF to 2dp
  Reject GSC < 0 or > 5

cosmicEngine.test.ts:
  1 movement = 1 CFP
  Total CFP = sum across all processes
  Separate E/X/R/W counts
  0 movements → 0 CFP
  Invalid movement type rejected

hybridEngine.test.ts:
  Weight validation: exactly 100% valid, 99%/101% invalid
  Score formula: Σ(score/max × weight%) × 100
  Boundary scores: 0→0, max→100
  Normalization factor scales output
  Complexity badges: 0-25=Low, 26-50=Med, 51-75=High, 76-100=VHigh
  Exact boundary: 25=Low, 26=Medium

overheadEngine.test.ts:
  % method: overhead = base × (value/100)
  Fixed method: overhead = constant regardless of base
  Inactive → 0 contribution
  applies_to controls which models are affected

costEngine.test.ts:
  cost = points × cost/point
  effort = points ÷ productivity_rate
  duration = effort ÷ team_size ÷ working_days
  Role-based: effort split by allocation%, cost = effort × rate
  Allocations must sum to 100%
  Average = (FPA+COSMIC+Hybrid)/3
  Low/High band = avg × 0.9 / 1.1

aiResponseParser.test.ts:
  Parses valid JSON classification
  Missing optional fields get defaults
  Throws on malformed JSON
  Throws on missing required fields
  Confidence clamped 0-100
  flags defaults to []

auditTrail.test.ts:
  Records all 8 required fields
  Throws if reason < 20 chars
  Allows exactly 20 chars
  Multiple overrides stored separately

aiEngine.test.ts (cloud providers):
  CF Workers AI: builds correct request, extracts response correctly
  Groq: correct Authorization header, json_object format
  Gemini: correct URL with key, responseSchema passed
  Fallback: CF→Groq when CF limit hit
  Fallback: Groq→Gemini when Groq limit hit
  All busy: throws daily limit error
  Usage counter incremented after each call
  429 retry: waits 2s and retries once

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — INTEGRATION TESTS (~95 tests)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auth.test.tsx:
  Login form renders all providers (email, Google, Microsoft)
  Successful login redirects to /dashboard
  Failed login shows error
  Sign out clears context → /login
  Admin sees admin link | Viewer sees no edit buttons

projectSetup.test.tsx:
  All form fields render
  Save calls Supabase upsert
  Required field validation
  Load project populates all fields
  Cost config saves to cost_config table
  Role allocation validates to 100%
  Delete admin-only with confirm dialog
  Viewer: all inputs disabled

userStories.test.tsx:
  Add story → appears in table
  Delete with confirm
  CSV upload → column mapping → import
  Jira fetch → source=jira badge
  Azure fetch → source=azure badge
  AI status pills correct colour
  Analyse All disabled when no pending stories

aiEngine.test.tsx:
  Analyse calls /api/analyse with correct body
  FPA/COSMIC/Hybrid saved to correct tables
  COSMIC movements saved separately
  Status updated to classified
  Bulk analysis shows progress modal
  Low confidence → amber badge
  Flagged → yellow warning icon
  Override requires 20+ char reason
  Override saved to ai_overrides table
  Status → overridden after override
  Error response → user-friendly message
  Provider badge updates after analysis

fpaTab.test.tsx:
  ILF/EIF/EI/EO/EQ stories loaded
  Inline RET/DET edit recalculates complexity live
  UFP updates with complexity change
  All 14 GSC sliders render with labels
  TDI/VAF/AFP recalculate on slider change
  GSC saved to Supabase with debounce
  Cost box correct
  Viewer: inputs disabled

cosmicTab.test.tsx:
  Processes loaded with movements
  +Entry adds row, CFP increments
  Delete removes row, CFP decrements
  Grand total = sum of all processes
  Colour coding correct per type

hybridTab.test.tsx:
  Add criterion saves to Supabase
  Weight ≠ 100% shows red error
  Load template fills criteria
  Grid renders stories × criteria
  AI scores pre-fill cells
  Manual edit saves + amber highlight
  Weighted score recalculates live
  Bar chart ranks by score

overheadsTab.test.tsx:
  Add/toggle/delete overhead
  % method calculates correctly
  Fixed method ignores base
  applies_to controls model impact
  Cost cards show all 3 models

summaryTab.test.tsx:
  Model table correct values
  Average row correct
  ±10% band correct
  All 4 charts render
  PDF export triggered
  Excel export 7 sheets
  CSV export

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART E — E2E TESTS (~40 tests, Playwright)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auth.spec.ts: login, logout, invalid creds, protected routes
projectLifecycle.spec.ts: create→save→reload→fields intact,
  duplicate, delete, compare 2 projects
aiAnalysis.spec.ts: analyse story→panels appear, analyse all→progress,
  override→reason required→audit trail created, flagged warning
fpaWorkflow.spec.ts: edit RETs→complexity updates, GSC→VAF→AFP
cosmicWorkflow.spec.ts: add movement→CFP increments, delete→decrements
hybridWorkflow.spec.ts: add criteria→grid→score→chart, load template
overheadsAndCost.spec.ts: add overhead→totals update, role rates, cost/pt
summaryAndExport.spec.ts: full project→summary populated, PDF download,
  Excel download, CSV download
adminPanel.spec.ts: admin sees panel, change role, view audit, test AI
roleBasedAccess.spec.ts: viewer no edits, viewer no /admin,
  estimator no /admin, RLS rejects viewer API calls

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART F — TEST UTILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

renderWithProviders.tsx:
  Wraps: AuthContext (mockUser/profile/role) + ProjectContext +
         MemoryRouter + Supabase (via MSW)
  Options: { role: 'admin'|'estimator'|'viewer' }

supabaseTestHelpers.ts:
  seedProject, seedStories, seedClassifications,
  seedCriteria, seedOverheads, cleanupProject, mockSupabaseError

waitForAnalysis.ts:
  Waits for ai_status to change from 'analysing' → 'classified'/'flagged'
  Timeout: 10 seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART G — CI/CD (GitHub Actions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.github/workflows/test.yml:
  On: push, pull_request
  Jobs:
    unit-and-integration:
      → npm ci → vitest run --coverage
      → Fail if coverage < 90%
      → Upload coverage report artifact
    e2e (needs: unit-and-integration):
      → playwright install --with-deps chromium
      → npm run build
      → serve build in background
      → playwright test
      → Upload playwright-report on failure

Branch protection: block merge on any failure or coverage < 90%
```

---

## Deployment Guide

```
STEP 1 — Push to GitHub:
  git init && git remote add origin https://github.com/your-org/repo
  git push -u origin main

STEP 2 — Connect Cloudflare Pages:
  pages.cloudflare.com → Create project → Connect Git
  Framework: Create React App
  Build command: npm run build
  Output: build
  Environment variables:
    REACT_APP_SUPABASE_URL = your Supabase URL
    REACT_APP_SUPABASE_ANON_KEY = your anon key

STEP 3 — Add Cloudflare Secrets (for Workers AI proxy):
  In Cloudflare Pages → Settings → Environment Variables:
    SUPABASE_URL = your Supabase URL
    SUPABASE_SERVICE_KEY = your Supabase service role key
    GROQ_API_KEY = from console.groq.com (free, no card)
    GEMINI_API_KEY = from aistudio.google.com (optional)

STEP 4 — Configure Supabase Auth Redirect URLs:
  Supabase → Auth → URL Config → Add:
    https://your-project.pages.dev
    https://your-custom-domain.com

STEP 5 — Enable Cloudflare Workers AI binding:
  Cloudflare dashboard → Workers & Pages → your project
  → Settings → Functions → KV namespace bindings
  → Add AI binding: variable name = AI

STEP 6 — Done. Auto-deploys on every git push to main.

Free tier limits to monitor:
  Supabase: 500MB DB, 50K auth users, pause after 1 week idle
  Cloudflare Workers AI: 10,000 neurons/day
  Groq: 14,400 req/day, 30 RPM
  Gemini: 1,500 req/day, 15 RPM
```

---

## Implementation Checklist

- [ ] Prompt 1 — Scaffold, Supabase schema, auth, navigation
- [ ] Prompt 11 Part A+B — Test infra + MSW handlers
- [ ] Prompt 2 — Project Setup screen
- [ ] Prompt 3 — User Story ingestion
- [ ] Prompt 4 — AI Engine (Cloudflare + Groq + Gemini)
- [ ] Prompt 5 — FPA tab + unit tests
- [ ] Prompt 6 — COSMIC tab + unit tests
- [ ] Prompt 7 — Hybrid Model tab + unit tests
- [ ] Prompt 8 — Overheads & Cost tab
- [ ] Prompt 9 — Summary Dashboard + Export
- [ ] Prompt 10 — Admin Panel
- [ ] Prompt 11 Parts D+E+F+G — Integration, E2E, CI/CD
