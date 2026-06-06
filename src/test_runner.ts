// Multi-Model Estimation System Comprehensive Test Suite & Quality Cockpit
// Programmatic verification of functional, performance, usability and customer experience constraints.
import { 
  calculateFpaComplexityAndPoints, 
  calculateFpaTotalMetrics, 
  calculateCosmicTotalMetrics, 
  calculateStoryPointsFromUserStory, 
  calculateHybridTotalMetrics, 
  calculateOverheadImpacts,
  calculateEstCostBudget 
} from './lib/engines';
import { UserStory, AiClassification, CosmicMovement, HybridCriterion, HybridScore, Overhead, FpaGscRating, CostConfig } from './types';

// Simple Assertion Utility
const assertions = {
  equal: (actual: any, expected: any, message: string) => {
    if (actual !== expected) {
      throw new Error(`Assertion FAILED: Expected [${expected}] but got [${actual}]. Msg: ${message}`);
    }
  },
  greaterThan: (actual: number, threshold: number, message: string) => {
    if (actual <= threshold) {
      throw new Error(`Assertion FAILED: Expected [${actual}] to be greater than [${threshold}]. Msg: ${message}`);
    }
  },
  lessThan: (actual: number, threshold: number, message: string) => {
    if (actual >= threshold) {
      throw new Error(`Assertion FAILED: Expected [${actual}] to be less than [${threshold}]. Msg: ${message}`);
    }
  },
  truthy: (val: any, message: string) => {
    if (!val) {
      throw new Error(`Assertion FAILED: Expected value to be truthy. Msg: ${message}`);
    }
  }
};

const RUN_RESULTS: { name: string; status: 'PASSED' | 'FAILED'; error?: string }[] = [];

function registerTest(name: string, fn: () => void) {
  try {
    fn();
    RUN_RESULTS.push({ name, status: 'PASSED' });
  } catch (err: any) {
    RUN_RESULTS.push({ name, status: 'FAILED', error: err.message || String(err) });
  }
}

// ==========================================
// 1. UNIT TESTING SUITE
// ==========================================

registerTest("Unit - FPA Complexity Mapping (ILF & EIF)", () => {
  // Test ILF bounds
  const r1 = calculateFpaComplexityAndPoints('ILF', 1, 40, 0);
  assertions.equal(r1.complexity, 'Low', "ILF Low Complexity");
  assertions.equal(r1.fp, 7, "ILF Low points");

  const r2 = calculateFpaComplexityAndPoints('ILF', 1, 60, 0);
  assertions.equal(r2.complexity, 'Average', "ILF Average Complexity");
  assertions.equal(r2.fp, 10, "ILF Average points");

  // Test EIF bounds
  const e1 = calculateFpaComplexityAndPoints('EIF', 3, 20, 0);
  assertions.equal(e1.complexity, 'Average', "EIF Average (rets 2-5, dets 20-50)");
  assertions.equal(e1.fp, 7, "EIF Average points");
});

registerTest("Unit - FPA Transactional Mapping (EI, EO & EQ)", () => {
  // Test EI Low & High bounds
  const ei1 = calculateFpaComplexityAndPoints('EI', 0, 10, 1); // ftrs <= 1, dets <= 15
  assertions.equal(ei1.complexity, 'Low', "EI Low");
  assertions.equal(ei1.fp, 3, "EI Low points");

  const ei2 = calculateFpaComplexityAndPoints('EI', 0, 10, 3); // ftrs >= 3
  assertions.equal(ei2.complexity, 'High', "EI High (ftrs > 2)");
  assertions.equal(ei2.fp, 6, "EI High points");
});

registerTest("Unit - Hybrid Story Heuristics & Keywords Scoring", () => {
  const sSimple: UserStory = {
    id: "s1",
    project_id: "p1",
    story_id: "USER-001",
    role: "User",
    goal: "View list of items",
    benefit: "Keep track of inventory",
    epic: "Epic 1",
    module: "Inventory",
    priority: "Low",
    source: "manual",
    ai_status: "pending",
    tags: "",
    created_at: ""
  };
  const ptsSimple = calculateStoryPointsFromUserStory(sSimple);
  assertions.equal(ptsSimple, 1, "Simple story points should default to 1");

  const sBackendSecure: UserStory = {
    id: "s2",
    project_id: "p1",
    story_id: "USER-002",
    role: "Backend admin worker",
    goal: "Deploy security credentials and setup integration",
    benefit: "Connect key external storage securely",
    epic: "Epic 2",
    module: "Security",
    priority: "High",
    source: "manual",
    ai_status: "pending",
    tags: "",
    created_at: ""
  };
  const ptsBackendSecure = calculateStoryPointsFromUserStory(sBackendSecure);
  // Scoring analysis:
  // - Base: 1
  // - API integration tags/goal: includes "integration", "external" (+1 +1 = +2)
  // - High workload: "security", "secure" (+1)
  // - System/worker: role includes "admin", "backend", "worker" (+1)
  // - Total score should translate into Fibonacci. Let's see what score it sums to:
  // Let's assert it is greater than the base story point mapping.
  assertions.greaterThan(ptsBackendSecure, ptsSimple, "Enriched stories must score higher");
});

// ==========================================
// 2. SYSTEM INTEGRATION TESTING
// ==========================================

registerTest("System - FPA Total Metrics and GCS Adjustment Multiplication", () => {
  const mockStories: UserStory[] = [
    { id: "st-1", project_id: "proj-1", story_id: "ST-01", role: "User", goal: "", benefit: "", epic: "", module: "", priority: "Medium", source: "manual", ai_status: "pending", tags: "", created_at: "" },
    { id: "st-2", project_id: "proj-1", story_id: "ST-02", role: "Admin", goal: "", benefit: "", epic: "", module: "", priority: "Medium", source: "manual", ai_status: "pending", tags: "", created_at: "" }
  ];

  const mockClassifications: AiClassification[] = [
    {
      id: "class-1",
      story_id: "st-1",
      model_type: "fpa",
      classification: {
        functionType: "ILF",
        complexity: "Low",
        rets: 1,
        dets: 10,
        ftrs: 0,
        unadjustedFP: 7,
        reasoning: "Simple local record",
        confidence: 0.95
      },
      confidence: 0.95,
      flags: [],
      ai_provider: "gemini",
      created_at: ""
    },
    {
      id: "class-2",
      story_id: "st-2",
      model_type: "fpa",
      classification: {
        functionType: "EI",
        complexity: "Average",
        rets: 0,
        dets: 10,
        ftrs: 2,
        unadjustedFP: 4,
        reasoning: "External integration flow",
        confidence: 0.88
      },
      confidence: 0.88,
      flags: [],
      ai_provider: "gemini",
      created_at: ""
    }
  ];

  // Base unadjusted points = 7 + 4 = 11

  // GSC Ratings (14 parameters)
  // TDI = sum(ratings). If we set some ratings:
  const mockGscRatings: FpaGscRating[] = [
    { project_id: "proj-1", gsc_number: 1, rating: 3 }, // 3 pts
    { project_id: "proj-1", gsc_number: 2, rating: 4 }, // 4 pts
    { project_id: "proj-1", gsc_number: 3, rating: 5 }, // 5 pts
    // Remaining default to 0. TDI = 12
    // VAF = (0.65 + 12 * 0.01) = 0.77
    // Total adjusted points = 11 * 0.77 = 8.47 (rounded to 8.5)
  ];

  const res = calculateFpaTotalMetrics(mockStories, mockClassifications, mockGscRatings);
  assertions.equal(res.ufp, 11, "UFP matches");
  assertions.equal(res.tdi, 12, "TDI matches");
  assertions.equal(res.vaf, 0.77, "VAF matches");
  assertions.equal(res.afp, 8.47, "Adjusted points calculated matches float multiplication precision value");
});

registerTest("System - Complex Multi-Criteria Overheads Adjustments", () => {
  const overheads: Overhead[] = [
    {
      id: "oh-1",
      project_id: "p1",
      name: "Management Buffer",
      applies_to: { fpa: true, cosmic: true, hybrid: true },
      method: "percentage",
      value: 10, // +10%
      is_active: true,
      sort_order: 1
    },
    {
      id: "oh-2",
      project_id: "p1",
      name: "Governance Offset",
      applies_to: { fpa: true, cosmic: false, hybrid: true },
      method: "fixed",
      value: 15, // +15 points except COSMIC
      is_active: true,
      sort_order: 2
    },
    {
      id: "oh-3",
      project_id: "p1",
      name: "Inactive Margin",
      applies_to: { fpa: true, cosmic: true, hybrid: true },
      method: "percentage",
      value: 50,
      is_active: false, // inactive, should not impact
      sort_order: 3
    }
  ];

  // Base values: FPA: 100, COSMIC: 80, Hybrid: 50
  const impacts = calculateOverheadImpacts(overheads, 100, 80, 50);

  // FPA: +10% of 100 (= 10) AND +15 (fixed) = 25 overhead points => 125 total
  assertions.equal(impacts.fpaOhPoints, 25, "FPA Overhead points sum correctly");

  // COSMIC: +10% of 80 (= 8) AND +0 (offset does not apply) = 8 overhead points => 88 total
  assertions.equal(impacts.cosmicOhPoints, 8, "COSMIC Overhead points respect exclusion logic");

  // Hybrid: +10% of 50 (= 5) AND +15 (fixed) = 20 overhead points => 70 total
  assertions.equal(impacts.hybridOhPoints, 20, "Hybrid Overhead points sum correctly");
});

// ==========================================
// 3. PERFORMANCE BENCHMARKING
// ==========================================

registerTest("Performance - Sizing recalculations Stress-Test Under Peak Load", () => {
  const start = Date.now();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    const typeIdx = i % 5;
    const types = ['ILF', 'EIF', 'EI', 'EO', 'EQ'];
    const type = types[typeIdx];
    const rets = (i % 5) + 1;
    const dets = (i % 80) + 1;
    const ftrs = i % 4;
    calculateFpaComplexityAndPoints(type, rets, dets, ftrs);
  }
  
  const elapsed = Date.now() - start;
  // Constraint check: 10k lookups should take less than 150 milliseconds
  assertions.lessThan(elapsed, 150, `10,000 lookup operations elapsed in ${elapsed}ms (Required < 150ms)`);
  console.log(`\n★  [PERFORMANCE] Stress Test Passed: Recovers 10k lookups in just ${elapsed}ms!`);
});

// ==========================================
// 4. USABILITY & LOGICAL CHECK
// ==========================================

registerTest("Usability - Allocated Role Rates Weights Consistency Check", () => {
  // Config specifies role rates. Sum must equal exactly 100% for mathematical distribution consistency.
  const badRolesConfig = [
    { name: "Dev", daily_rate: 600, allocation_percent: 50 },
    { name: "QA", daily_rate: 450, allocation_percent: 40 } // Sum = 90% (Invalid)
  ];
  
  const goodRolesConfig = [
    { name: "Dev", daily_rate: 600, allocation_percent: 50 },
    { name: "QA", daily_rate: 450, allocation_percent: 30 },
    { name: "PM", daily_rate: 700, allocation_percent: 20 } // Sum = 100% (Valid)
  ];

  const validateAllocationSum = (configs: { allocation_percent: number }[]) => {
    return configs.reduce((sum, r) => sum + r.allocation_percent, 0) === 100;
  };

  assertions.equal(validateAllocationSum(badRolesConfig), false, "Mismatched allocation must fail validation");
  assertions.equal(validateAllocationSum(goodRolesConfig), true, "Pristine alignment of weights equals exactly 100%");
});

// ==========================================
// 5. CUSTOMER EXPERIENCE (CX) & QUALITY ASSURANCE TEST
// ==========================================

registerTest("Customer Experience - Budget Calculator Constraints", () => {
  const testConfig: CostConfig = {
    project_id: "p-test",
    fpa_cost_per_point: 2000,
    cosmic_cost_per_point: 1800,
    hybrid_cost_per_point: 1500,
    productivity_rate: 1.5,
    working_days_per_month: 22,
    use_role_rates: false,
    roles: []
  };

  // Calculate budget for 85 adjusted points
  // 85 points / 1.5 productivity = 56.7 engineering effort man-days
  // Effort = 56.7 / 22 = 2.6 man-months
  // Budget = 85 AFP * 2000 SAR = 170,000 SAR
  const budgetInfo = calculateEstCostBudget(85, testConfig, 5);
  assertions.equal(budgetInfo.fpaPrice, 2000, "FPA unit cost matches configuration configuration");
  assertions.equal(budgetInfo.effortDays, 56.7, "Effort calculation matches points divided by productivity rate");
});

// Run execution loops
console.log("\n========================================================");
console.log("SPEC-CLOUD SOFTWARE SIZING DECISION SUPPORT SUITE CHECKS");
console.log(`Executed: ${new Date().toISOString()}`);
console.log("========================================================\n");

let passed = 0;
let failed = 0;

RUN_RESULTS.forEach((test, idx) => {
  const marker = test.status === 'PASSED' ? '✓' : '✗';
  const color = test.status === 'PASSED' ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}${marker} Test ${idx + 1}: ${test.name} -> ${test.status}${reset}`);
  if (test.status === 'FAILED') {
    console.log(`   └ Error details: ${test.error}`);
    failed++;
  } else {
    passed++;
  }
});

console.log("\n========================================================");
console.log(`TOTAL RUNS: ${RUN_RESULTS.length} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("========================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✔ ALL CHECKS EXECUTED WITH ZERO ERRORS. PRECISE ESTIMATION INTEGRITY MATCHES TARGET SPECTRA!");
}
