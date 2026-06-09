import { Project, UserStory, AiClassification, CosmicMovement, HybridCriterion, HybridScore, Overhead, FpaGscRating, CostConfig, FpaClassification } from '../types.js';

// --- FPA ENGINE ---
export function calculateFpaComplexityAndPoints(type: string, rets: number, dets: number, ftrs: number): { complexity: 'Low' | 'Average' | 'High'; fp: number } {
  const r = Number(rets) || 1;
  const d = Number(dets) || 1;
  const f = Number(ftrs) || 0;

  if (type === 'ILF') {
    if (r === 1) {
      if (d <= 50) return { complexity: 'Low', fp: 7 };
      return { complexity: 'Average', fp: 10 };
    } else if (r <= 5) {
      if (d <= 19) return { complexity: 'Low', fp: 7 };
      if (d <= 50) return { complexity: 'Average', fp: 10 };
      return { complexity: 'High', fp: 15 };
    } else {
      if (d <= 19) return { complexity: 'Average', fp: 10 };
      return { complexity: 'High', fp: 15 };
    }
  } else if (type === 'EIF') {
    if (r === 1) {
      if (d <= 50) return { complexity: 'Low', fp: 5 };
      return { complexity: 'Average', fp: 7 };
    } else if (r <= 5) {
      if (d <= 19) return { complexity: 'Low', fp: 5 };
      if (d <= 50) return { complexity: 'Average', fp: 7 };
      return { complexity: 'High', fp: 10 };
    } else {
      if (d <= 19) return { complexity: 'Average', fp: 7 };
      return { complexity: 'High', fp: 10 };
    }
  } else if (type === 'EI') {
    if (f <= 1) {
      if (d <= 15) return { complexity: 'Low', fp: 3 };
      return { complexity: 'Average', fp: 4 };
    } else if (f === 2) {
      if (d <= 4) return { complexity: 'Low', fp: 3 };
      if (d <= 15) return { complexity: 'Average', fp: 4 };
      return { complexity: 'High', fp: 6 };
    } else {
      if (d <= 4) return { complexity: 'Average', fp: 4 };
      return { complexity: 'High', fp: 6 };
    }
  } else if (type === 'EO') {
    if (f <= 1) {
      if (d <= 19) return { complexity: 'Low', fp: 4 };
      return { complexity: 'Average', fp: 5 };
    } else if (f === 2) {
      if (d <= 5) return { complexity: 'Low', fp: 4 };
      if (d <= 19) return { complexity: 'Average', fp: 5 };
      return { complexity: 'High', fp: 7 };
    } else {
      if (d <= 5) return { complexity: 'Average', fp: 5 };
      return { complexity: 'High', fp: 7 };
    }
  } else { // EQ
    if (f <= 1) {
      if (d <= 19) return { complexity: 'Low', fp: 3 };
      return { complexity: 'Average', fp: 4 };
    } else if (f === 2) {
      if (d <= 5) return { complexity: 'Low', fp: 3 };
      if (d <= 19) return { complexity: 'Average', fp: 4 };
      return { complexity: 'High', fp: 6 };
    } else {
      if (d <= 5) return { complexity: 'Average', fp: 4 };
      return { complexity: 'High', fp: 6 };
    }
  }
}

export function calculateFpaTotalMetrics(stories: UserStory[], classifications: AiClassification[], ratings: FpaGscRating[]) {
  // 1. Unadjusted Function Points (UFP)
  let ufp = 0;
  const breakdown = {
    ILF: { Low: 0, Average: 0, High: 0, points: 0 },
    EIF: { Low: 0, Average: 0, High: 0, points: 0 },
    EI: { Low: 0, Average: 0, High: 0, points: 0 },
    EO: { Low: 0, Average: 0, High: 0, points: 0 },
    EQ: { Low: 0, Average: 0, High: 0, points: 0 }
  };

  stories.forEach(s => {
    const classif = classifications.find(c => c.story_id === s.id && c.model_type === 'fpa');
    if (classif && classif.classification) {
      const fpa = classif.classification as FpaClassification;
      const fType = fpa.functionType;
      const comp = fpa.complexity || 'Average';
      const pts = fpa.unadjustedFP || 0;

      if (breakdown[fType]) {
        breakdown[fType][comp] += 1;
        breakdown[fType].points += pts;
      }
      ufp += pts;
    }
  });

  // 2. Value Adjustment Factor (VAF) from GSC ratings (14 ratings)
  const ratingsMap = new Map<number, number>();
  for (let i = 1; i <= 14; i++) ratingsMap.set(i, 0);
  ratings.forEach(r => {
    if (r.gsc_number >= 1 && r.gsc_number <= 14) {
      ratingsMap.set(r.gsc_number, r.rating);
    }
  });

  const tdi = Array.from(ratingsMap.values()).reduce((a, b) => a + b, 0);
  const vaf = Math.round((0.65 + tdi * 0.01) * 100) / 100; // standard IFPUG VAF formula

  // Adjusted Function Points (AFP)
  const afp = Math.round((ufp * vaf) * 100) / 100;

  return {
    ufp,
    tdi,
    vaf,
    afp,
    breakdown
  };
}

// --- COSMIC ENGINE ---
export function calculateCosmicTotalMetrics(stories: UserStory[], movements: CosmicMovement[]) {
  let totalCfp = 0;
  const breakdown = stories.map(s => {
    const storyMovements = movements.filter(m => m.story_id === s.id);
    const e = storyMovements.filter(m => m.movement_type === 'Entry').length;
    const x = storyMovements.filter(m => m.movement_type === 'Exit').length;
    const r = storyMovements.filter(m => m.movement_type === 'Read').length;
    const w = storyMovements.filter(m => m.movement_type === 'Write').length;
    const cfp = storyMovements.length;
    totalCfp += cfp;

    return {
      story_id: s.id,
      story_code: s.story_id,
      goal: s.goal,
      e, x, r, w,
      cfp
    };
  });

  // Calculate global distribution of movements
  const totalE = movements.filter(m => m.movement_type === 'Entry').length;
  const totalX = movements.filter(m => m.movement_type === 'Exit').length;
  const totalR = movements.filter(m => m.movement_type === 'Read').length;
  const totalW = movements.filter(m => m.movement_type === 'Write').length;

  return {
    totalCfp,
    breakdown,
    distribution: { Entry: totalE, Exit: totalX, Read: totalR, Write: totalW }
  };
}

// --- HYBRID ENGINE ---
export function calculateStoryPointsFromUserStory(s: UserStory): number {
  const goal = (s.goal || '').toLowerCase();
  const benefit = (s.benefit || '').toLowerCase();
  const tags = (s.tags || '').toLowerCase();
  const role = (s.role || '').toLowerCase();

  let score = 1; // base score

  // 1. Integration or API connectivity
  if (goal.includes('api') || benefit.includes('api') || tags.includes('api')) {
    score += 2;
  }
  if (goal.includes('integrat') || benefit.includes('integrat') || tags.includes('integrat')) {
    score += 1;
  }
  if (goal.includes('sync') || benefit.includes('sync') || tags.includes('sync')) {
    score += 1;
  }
  if (goal.includes('external') || benefit.includes('external') || tags.includes('external')) {
    score += 1;
  }

  // 2. High workload domains
  if (goal.includes('refund') || goal.includes('payment') || goal.includes('billing')) {
    score += 2;
  }
  if (goal.includes('security') || goal.includes('secure') || goal.includes('encrypt') || goal.includes('auth')) {
    score += 1;
  }
  if (goal.includes('database') || goal.includes('migration') || goal.includes('query')) {
    score += 1;
  }
  if (goal.includes('batch') || goal.includes('bulk') || goal.includes('real-time') || goal.includes('realtime')) {
    score += 1;
  }

  // 3. System component processing roles
  if (role.includes('system') || role.includes('admin') || role.includes('service') || role.includes('backend') || role.includes('upstream') || role.includes('worker')) {
    score += 1;
  }

  // 4. Manual setup / custom high priority
  if (s.priority?.toLowerCase() === 'high') {
    score += 1;
  }

  // 5. Text length heuristic
  const totalLength = goal.length + benefit.length;
  if (totalLength > 150) {
    score += 2;
  } else if (totalLength > 80) {
    score += 1;
  }

  // Map score to standard Agile Fibonacci Series Story Points: [1, 2, 3, 5, 8, 13]
  if (score <= 2) return 1;
  if (score === 3) return 2;
  if (score === 4 || score === 5) return 3;
  if (score === 6 || score === 7) return 5;
  if (score === 8 || score === 9) return 8;
  return 13;
}

export function calculateHybridScoreForStory(storyId: string, criteria: HybridCriterion[], scores: HybridScore[]): { weightedScore: number; complexity: 'Simple' | 'Complex' } {
  let sumScores = 0;
  let maxTotal = 0;

  criteria.forEach(crit => {
    const scoreObj = scores.find(s => s.story_id === storyId && s.criterion_id === crit.id);
    const scoreVal = scoreObj ? scoreObj.score : 0;
    const maxVal = 5;

    sumScores += scoreVal;
    maxTotal += maxVal;
  });

  const scoreFactor = maxTotal > 0 ? (sumScores / maxTotal) * 100 : 0;
  const weightedScore = Math.round(scoreFactor * 10) / 10;

  const complexity = weightedScore >= 50 ? 'Complex' : 'Simple';

  return {
    weightedScore,
    complexity
  };
}

export function calculateHybridTotalMetrics(stories: UserStory[], criteria: HybridCriterion[], scores: HybridScore[], overheads: any = null) {
  let totalBaseHybridPoints = 0;
  const storyScores: { [key: string]: number } = {};

  const breakdown = stories.map(s => {
    const { weightedScore, complexity } = calculateHybridScoreForStory(s.id, criteria, scores);

    // Use saved story_points (from Fibonacci series) or calculate independently based on the user story
    const pts = s.story_points !== undefined && s.story_points !== null ? Number(s.story_points) : calculateStoryPointsFromUserStory(s);

    totalBaseHybridPoints += pts;
    storyScores[s.id] = pts;
    return {
      story_id: s.id,
      story_code: s.story_id,
      goal: s.goal,
      score: weightedScore,
      points: pts,
      complexity
    };
  });

  const normalisedPoints = totalBaseHybridPoints;

  // Calculate overheads
  const list = Array.isArray(overheads) ? overheads : [];
  const activeOverheads = list.filter(oh => oh.is_active);
  const totalOverheadPercent = activeOverheads
    .filter(oh => oh.applies_to?.hybrid ?? true)
    .reduce((sum, oh) => sum + (oh.method === 'percentage' ? oh.value : 0), 0);

  let overheadsRecord: any = {
    project_id: '',
    project_management: 0,
    testing: 0,
    devops: 0
  };

  return {
    totalBaseHybridPoints,
    totalHybridFp: totalBaseHybridPoints,
    normalisedPoints,
    breakdown,
    storyScores,
    overheadsRecord,
    totalOverheadPercent
  };
}

// --- OVERHEAD ENGINE ---
export interface AppliedOverheadSummary {
  id: string;
  name: string;
  method: 'percentage' | 'fixed';
  value: number;
  fpaImpact: number;
  cosmicImpact: number;
  hybridImpact: number;
}

export function calculateOverheadImpacts(overheads: Overhead[], fpaBasePoints: number, cosmicBasePoints: number, hybridBasePoints: number) {
  const applied: AppliedOverheadSummary[] = [];
  let fpaOhPoints = 0;
  let cosmicOhPoints = 0;
  let hybridOhPoints = 0;

  const list = Array.isArray(overheads) ? overheads : [];
  const activeOverheads = list.filter(oh => oh.is_active);

  for (const oh of activeOverheads) {
    const fpaApplies = oh.applies_to?.fpa ?? true;
    const cosmicApplies = oh.applies_to?.cosmic ?? true;
    const hybridApplies = oh.applies_to?.hybrid ?? true;

    const fpaImpact = fpaApplies
      ? (oh.method === 'percentage' ? fpaBasePoints * (oh.value / 100) : oh.value)
      : 0;

    const cosmicImpact = cosmicApplies
      ? (oh.method === 'percentage' ? cosmicBasePoints * (oh.value / 100) : oh.value)
      : 0;

    const hybridImpact = hybridApplies
      ? (oh.method === 'percentage' ? hybridBasePoints * (oh.value / 100) : oh.value)
      : 0;

    fpaOhPoints += fpaImpact;
    cosmicOhPoints += cosmicImpact;
    hybridOhPoints += hybridImpact;

    applied.push({
      id: oh.id,
      name: oh.name,
      method: oh.method,
      value: oh.value,
      fpaImpact,
      cosmicImpact,
      hybridImpact
    });
  }

  return {
    applied,
    fpaOhPoints,
    cosmicOhPoints,
    hybridOhPoints
  };
}

// --- COST ENGINE ---
export function calculateEstCostBudget(points: number, costConfig: CostConfig | null, teamSize: number) {
  const baseRate = costConfig?.productivity_rate ?? 1.5;
  const workingDays = costConfig?.working_days_per_month ?? 22;

  // Cost per point defaults
  const fpaPrice = costConfig?.fpa_cost_per_point ?? 500;
  const cosmicPrice = costConfig?.cosmic_cost_per_point ?? 500;
  const hybridPrice = costConfig?.hybrid_cost_per_point ?? 500;

  // Effort = Points / productivity_rate (person-days)
  const effortDays = Math.round((points / baseRate) * 10) / 10;

  // Duration = Effort / teamSize / workingDays (months)
  const durationMonths = teamSize > 0 ? Math.round((effortDays / teamSize / workingDays) * 10) / 10 : 0;

  // Financial Estimation
  let calculatedCost = 0;
  const rolesBreakdown: { name: string; days: number; cost: number }[] = [];

  if (costConfig?.use_role_rates && costConfig.roles?.length > 0) {
    // Total allocations check
    const totalAlloc = costConfig.roles.reduce((sum, r) => sum + (r.allocation_percent || 0), 0);
    const normalizedFactor = totalAlloc > 0 ? 100 / totalAlloc : 1.0;

    costConfig.roles.forEach(role => {
      const allocation = (role.allocation_percent || 0) * normalizedFactor / 100;
      const roleDays = Math.round((effortDays * allocation) * 10) / 10;
      const roleCost = Math.round(roleDays * (role.daily_rate || 0));
      calculatedCost += roleCost;

      rolesBreakdown.push({
        name: role.name,
        days: roleDays,
        cost: roleCost
      });
    });
  }

  return {
    effortDays,
    durationMonths,
    fpaPrice,
    cosmicPrice,
    hybridPrice,
    useRoles: costConfig?.use_role_rates ?? false,
    calculatedCost,
    rolesBreakdown
  };
}
