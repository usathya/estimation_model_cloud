export type RoleType = 'admin' | 'estimator' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  organisation: string;
  role: RoleType;
  jira_config?: {
    url: string;
    projectKey: string;
  };
  azure_config?: {
    orgUrl: string;
    project: string;
  };
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  version: string;
  project_type: 'Web App' | 'Enterprise-ERP' | 'Mobile App' | 'Embedded-Realtime' | 'Mixed';
  estimator_id: string;
  estimator_name?: string;
  status: 'Draft' | 'Under Review' | 'Approved';
  currency: string;
  team_size: number;
  created_at: string;
  updated_at: string;
  actual_cost?: number | null;
  actual_effort_days?: number | null;
  actual_duration_months?: number | null;
  story_count?: number;
  fpa_points?: number;
  cosmic_points?: number;
  hybrid_points?: number;
  fpa_points_with_overheads?: number;
  cosmic_points_with_overheads?: number;
  hybrid_points_with_overheads?: number;
}

export interface UserStory {
  id: string;
  project_id: string;
  story_id: string; // Identifier e.g. STORY-001
  role: string;
  goal: string;
  benefit: string;
  epic: string;
  module: string;
  priority: 'High' | 'Medium' | 'Low';
  source: 'manual' | 'file' | 'jira' | 'azure';
  raw_text?: string;
  ai_status: 'pending' | 'analysing' | 'classified' | 'overridden' | 'flagged';
  tags: string;
  created_at: string;
  story_points?: number | null;
  elaboration_text?: string;
}

export interface FpaClassification {
  functionType: 'ILF' | 'EIF' | 'EI' | 'EO' | 'EQ';
  complexity: 'Low' | 'Average' | 'High';
  rets: number;
  dets: number;
  ftrs: number;
  unadjustedFP: number;
  reasoning: string;
  confidence: number;
}

export interface CosmicMovement {
  id: string;
  story_id: string;
  name: string;
  movement_type: 'Entry' | 'Exit' | 'Read' | 'Write';
  data_group: string;
  reasoning: string;
  is_ai_generated: boolean;
  created_at?: string;
}

export interface CosmicClassification {
  functionalProcess: string;
  dataMovements: Omit<CosmicMovement, 'id' | 'story_id'>[];
  cfp: number;
  reasoning: string;
  confidence: number;
}

export interface HybridDimensionScores {
  uiComplexity: number;
  integrationRisk: number;
  dataVolume: number;
  businessLogic: number;
}

export interface HybridClassification {
  complexity: 'Simple' | 'Complex';
  suggestedWeightScore: number;
  dimensions: HybridDimensionScores;
  reasoning: string;
  confidence: number;
}

export interface AiClassification {
  id: string;
  story_id: string;
  model_type: 'fpa' | 'cosmic' | 'hybrid';
  classification: FpaClassification | CosmicClassification | HybridClassification;
  confidence: number;
  flags: string[];
  ai_provider: string;
  created_at: string;
}

export interface AiOverride {
  id: string;
  story_id: string;
  user_id: string;
  user_name?: string;
  model_type: 'fpa' | 'cosmic' | 'hybrid';
  field_changed: string;
  original_value: string;
  override_value: string;
  reason: string;
  created_at: string;
}

export interface FpaGscRating {
  project_id: string;
  gsc_number: number; // 1 to 14
  rating: number; // 0 to 5
}

export interface HybridCriterion {
  id: string;
  project_id: string;
  name: string;
  max_score: number;
  weight_percent: number;
  description: string;
  sort_order: number;
}

export interface HybridScore {
  id: string;
  story_id: string;
  criterion_id: string;
  score: number;
  is_ai_suggested: boolean;
}

export interface Overhead {
  id: string;
  project_id: string;
  name: string;
  applies_to: { fpa: boolean; cosmic: boolean; hybrid: boolean };
  method: 'percentage' | 'fixed';
  value: number;
  is_active: boolean;
  sort_order: number;
}

export interface CostConfig {
  project_id: string;
  fpa_cost_per_point: number;
  cosmic_cost_per_point: number;
  hybrid_cost_per_point: number;
  productivity_rate: number;
  fpa_productivity_rate?: number;
  cosmic_productivity_rate?: number;
  hybrid_productivity_rate?: number;
  working_days_per_month: number;
  use_role_rates: boolean;
  blended_rate?: number;
  roles: { 
    name: string; 
    daily_rate: number; 
    allocation_percent: number; 
    resources_onsite?: number;
    resources_offshore?: number;
    resources_nearshore?: number;
    resources_employee?: number;
  }[];
}

export interface SystemConfig {
  default_currency: string;
  default_productivity_rate: number;
  default_fpa_productivity_rate?: number;
  default_cosmic_productivity_rate?: number;
  default_hybrid_productivity_rate?: number;
  default_fpa_cost_per_point: number;
  default_cosmic_cost_per_point: number;
  default_hybrid_cost_per_point: number;
  ai_primary_provider: 'cloudflare' | 'groq' | 'gemini';
  cf_ai_model: string;
  groq_model: string;
  gemini_enabled: boolean;
  ai_fallback_enabled: boolean;
}

export interface AiUsageStats {
  provider: string;
  date: string;
  request_count: number;
  neuron_count?: number;
}

export interface AiErrorLog {
  id: string;
  story_id?: string;
  provider: string;
  error_type: string;
  error_message: string;
  created_at: string;
}
