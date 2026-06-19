import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { SaudiRiyalIcon } from '../icons/SaudiRiyalIcon';
import { 
  calculateFpaTotalMetrics, 
  calculateCosmicTotalMetrics, 
  calculateHybridTotalMetrics,
  calculateOverheadImpacts
} from '../../lib/engines';
import { 
  Scale, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  MessageSquare, 
  CheckCircle,
  AlertTriangle,
  Flame,
  TrendingDown,
  Coins,
  Cpu,
  BookmarkCheck,
  Plus,
  Trash2,
  Settings,
  Percent
} from 'lucide-react';

export default function CalibrationFeedback() {
  const { currentProject, setProjectScope, saveOverhead, deleteOverhead, saveCostConfig } = useProject();
  const { isViewer, profile } = useAuth();

  const [initProjectId, setInitProjectId] = useState<string | null>(null);
  const [initHasConfig, setInitHasConfig] = useState(false);

  const [isActualsOpen, setIsActualsOpen] = useState(true);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);

  // Local actual inputs
  const [trueCost, setTrueCost] = useState<number>(0);
  const [trueEffort, setTrueEffort] = useState<number>(0);
  const [trueDuration, setTrueDuration] = useState<number>(0);

  // Calibration Form input values
  const [subject, setSubject] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Cost Configuration States
  const [prodInput, setProdInput] = useState<number>(1.5);
  const [fpaProdInput, setFpaProdInput] = useState<number>(0.75);
  const [cosmicProdInput, setCosmicProdInput] = useState<number>(1.5);
  const [hybridProdInput, setHybridProdInput] = useState<number>(1.5);
  const [fpaInput, setFpaInput] = useState<number>(1875);
  const [cosmicInput, setCosmicInput] = useState<number>(1875);
  const [hybridInput, setHybridInput] = useState<number>(1875);

  // Load calculations models
  const fpaMetrics = calculateFpaTotalMetrics(currentProject.stories, currentProject.classifications, currentProject.ratings);
  const cosmicMetrics = calculateCosmicTotalMetrics(currentProject.stories, currentProject.movements);
  const hybridMetrics = calculateHybridTotalMetrics(currentProject.stories, currentProject.criteria, currentProject.scores, currentProject.overheads);

  // Load dynamically configured project overheads and perform impact calculations
  const overheadsList = currentProject.overheads || [];
  const fpaBasePoints = fpaMetrics.afp;
  const cosmicBasePoints = cosmicMetrics.totalCfp;
  const hybridBasePoints = hybridMetrics.totalHybridFp;

  const ohImpacts = calculateOverheadImpacts(overheadsList, fpaBasePoints, cosmicBasePoints, hybridBasePoints);

  // Total adjusted points including active overheads
  const fpaTotalPoints = Math.round((fpaBasePoints + ohImpacts.fpaOhPoints) * 100) / 100;
  const cosmicTotalPoints = Math.round((cosmicBasePoints + ohImpacts.cosmicOhPoints) * 100) / 100;
  const hybridTotalPoints = Math.round((hybridBasePoints + ohImpacts.hybridOhPoints) * 100) / 100;

  // Constant Pricing factor indicators
  const isRoleBased = currentProject.costConfig?.use_role_rates ?? false;
  const rolesList = currentProject.costConfig?.roles || [];
  const netFte = isRoleBased 
    ? rolesList.reduce((sum, r) => sum + ((r.allocation_percent || 0) / 100) * ((r.resources_onsite || 0) + (r.resources_offshore || 0) + (r.resources_nearshore || 0)), 0)
    : 0;
  const teamSize = (isRoleBased && netFte > 0) ? Math.round(netFte * 100) / 100 : (currentProject.project?.team_size ?? 5);
  const workDays = currentProject.costConfig?.working_days_per_month ?? 22;

  const fpaProd = currentProject.costConfig?.fpa_productivity_rate ?? 0.75;
  const cosmicProd = currentProject.costConfig?.cosmic_productivity_rate ?? 1.5;
  const hybridProd = currentProject.costConfig?.hybrid_productivity_rate ?? 1.5;

  const fpaCostPerPoint = currentProject.costConfig?.fpa_cost_per_point ?? 1875;
  const cosmicCostPerPoint = currentProject.costConfig?.cosmic_cost_per_point ?? 1875;
  const hybridCostPerPoint = currentProject.costConfig?.hybrid_cost_per_point ?? 1875;

  // Final adjusted cost, effort and schedule calculations
  const fpaCost = fpaTotalPoints * fpaCostPerPoint;
  const fpaEffort = Math.round((fpaTotalPoints / fpaProd) * 10) / 10;
  const fpaDuration = teamSize > 0 ? Math.round((fpaEffort / teamSize / workDays) * 10) / 10 : 0;

  const cosmicCost = cosmicTotalPoints * cosmicCostPerPoint;
  const cosmicEffort = Math.round((cosmicTotalPoints / cosmicProd) * 10) / 10;
  const cosmicDuration = teamSize > 0 ? Math.round((cosmicEffort / teamSize / workDays) * 10) / 10 : 0;

  const hybridCost = hybridTotalPoints * hybridCostPerPoint;
  const hybridEffort = Math.round((hybridTotalPoints / hybridProd) * 10) / 10;
  const hybridDuration = teamSize > 0 ? Math.round((hybridEffort / teamSize / workDays) * 10) / 10 : 0;

  useEffect(() => {
    if (!currentProject.project) {
      setInitProjectId(null);
      setInitHasConfig(false);
      return;
    }

    const projId = currentProject.project.id;
    const hasConfig = !!currentProject.costConfig;

    if (projId !== initProjectId || (hasConfig && !initHasConfig)) {
      setInitProjectId(projId);
      setInitHasConfig(hasConfig);

      if (projId !== initProjectId) {
        setTrueCost(currentProject.project.actual_cost || 0);
        setTrueEffort(currentProject.project.actual_effort_days || 0);
        setTrueDuration(currentProject.project.actual_duration_months || 0);
      }

      if (currentProject.costConfig) {
        setProdInput(currentProject.costConfig.productivity_rate || 1.5);
        setFpaProdInput(currentProject.costConfig.fpa_productivity_rate ?? 0.75);
        setCosmicProdInput(currentProject.costConfig.cosmic_productivity_rate ?? 1.5);
        setHybridProdInput(currentProject.costConfig.hybrid_productivity_rate ?? 1.5);
        setFpaInput(currentProject.costConfig.fpa_cost_per_point || 1875);
        setCosmicInput(currentProject.costConfig.cosmic_cost_per_point || 1875);
        setHybridInput(currentProject.costConfig.hybrid_cost_per_point || 1875);
      }
    }

    loadFeedbacks();
  }, [currentProject.project, currentProject.costConfig, initProjectId, initHasConfig]);

  const handleUpdateCostConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer || !currentProject.project) return;

    const payload = {
      ...(currentProject.costConfig || {
        project_id: currentProject.project.id,
        working_days_per_month: 22,
        use_role_rates: false,
        roles: []
      }),
      productivity_rate: Number(prodInput),
      fpa_productivity_rate: Number(fpaProdInput),
      cosmic_productivity_rate: Number(cosmicProdInput),
      hybrid_productivity_rate: Number(hybridProdInput),
      fpa_cost_per_point: Number(fpaInput),
      cosmic_cost_per_point: Number(cosmicInput),
      hybrid_cost_per_point: Number(hybridInput)
    } as any;

    await saveCostConfig(payload);
    alert('Dynamic Rates & Productivity factor recorded successfully!');
  };

  const loadFeedbacks = () => {
    if (!currentProject.project) return;
    fetch(`/api/estimator_feedback?projectId=${currentProject.project.id}`)
      .then(r => r.json())
      .then(data => setFeedbackList(data))
      .catch(console.error);
  };

  const handleActualsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject.project || isViewer) return;

    try {
      const res = await fetch(`/api/projects/${currentProject.project.id}/actuals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_cost: Number(trueCost),
          actual_effort_days: Number(trueEffort),
          actual_duration_months: Number(trueDuration)
        })
      });

      if (res.ok) {
        const updatedProj = await res.json();
        setProjectScope(prev => ({ ...prev, project: updatedProj }));
        alert('Historical actual reference points recorded successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };



  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject.project || !subject.trim() || !feedbackText.trim() || isViewer) return;
    setSubmittingFeedback(true);

    const payload = {
      project_id: currentProject.project.id,
      estimator_name: profile?.full_name || 'Umesh S.',
      subject,
      rating: Number(rating),
      review_comment: feedbackText
    };

    try {
      const res = await fetch('/api/estimator_feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSubject('');
        setFeedbackText('');
        loadFeedbacks();
        alert('Feedback log saved to audit timeline!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Variance formula parser (Prompt 8 details): Value - Actual / Actual * 100
  const getVariance = (estimated: number, actual: number) => {
    if (!actual || actual === 0) return null;
    const variance = ((estimated - actual) / actual) * 100;
    return variance;
  };

  const getVarianceBadge = (variance: number | null) => {
    if (variance === null) return <span className="text-slate-400 font-mono">-</span>;
    const absVal = Math.abs(variance);
    const textSymbol = variance > 0 ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`;
    
    if (absVal <= 10) {
      return <span className="inline-block bg-emerald-100 text-emerald-850 font-mono font-extrabold text-[10px] px-2 py-0.5 rounded">{textSymbol} (Excellent Match)</span>;
    }
    if (absVal <= 25) {
      return <span className="inline-block bg-amber-100 text-amber-850 font-mono font-extrabold text-[10px] px-2 py-0.5 rounded">{textSymbol} (Minor Drift)</span>;
    }
    return <span className="inline-block bg-rose-100 text-rose-850 font-mono font-extrabold text-[10px] px-2 py-0.5 rounded">{textSymbol} (High Drift Check)</span>;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      
      {/* SECTION 1: GLOBAL COST & PRODUCTIVITY COEFFICIENTS (Common for all models) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Percent className="w-4.5 h-4.5 text-indigo-650" />
            <span className="font-sans font-extrabold text-xs text-slate-700">Financial Rates & Productivity Parameters</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Common configuration for FPA, COSMIC, and Hybrid models</span>
        </div>
        
        <form onSubmit={handleUpdateCostConfig} className="p-5 text-xs font-sans text-slate-650 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">FPA Prod (pts/day)</label>
            <input
              type="number"
              step="0.1"
              disabled={isViewer}
              value={fpaProdInput}
              onChange={(e) => setFpaProdInput(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">FPA Cost per Point ({currentProject.project?.currency || 'SAR'})</label>
            <input
              type="number"
              disabled={isViewer}
              value={fpaInput}
              onChange={(e) => setFpaInput(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">COSMIC Prod (pts/day)</label>
            <input
              type="number"
              step="0.1"
              disabled={isViewer}
              value={cosmicProdInput}
              onChange={(e) => setCosmicProdInput(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-[#522986] font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">COSMIC Cost per Point ({currentProject.project?.currency || 'SAR'})</label>
            <input
              type="number"
              disabled={isViewer}
              value={cosmicInput}
              onChange={(e) => setCosmicInput(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Hybrid Prod (pts/day)</label>
            <input
              type="number"
              step="0.1"
              disabled={isViewer}
              value={hybridProdInput}
              onChange={(e) => setHybridProdInput(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-emerald-650 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Hybrid Cost/Point ({currentProject.project?.currency || 'SAR'})</label>
            <input
              type="number"
              disabled={isViewer}
              value={hybridInput}
              onChange={(e) => setHybridInput(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          {!isViewer && (
            <button
               id="cost-config-save-btn"
               type="submit"
               className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded shadow transition cursor-pointer leading-tight h-9 font-mono text-[9px] uppercase w-full"
            >
              Update Parameters
            </button>
          )}
        </form>
      </div>


      {/* SECTION 3: HISTORICAL ACTUALS REFERENCE LOGS (Collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div
          onClick={() => setIsActualsOpen(!isActualsOpen)}
          className="w-full bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4.5 h-4.5 text-teal-650" />
            <span className="font-sans font-extrabold text-xs text-slate-700">Historical Projects actual Reference Points</span>
          </div>
          {isActualsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>

        {isActualsOpen && (
          <form onSubmit={handleActualsSave} className="p-6 space-y-4 text-xs font-sans text-slate-650 bg-white">
            <p className="text-slate-400 text-[11px]">Audit and record actual completed metrics (Cost, Effort, and Timing) to calibrate future algorithm weightings.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">True Actual Cost ({currentProject.project?.currency || 'SAR'})</label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="actual-cost-input"
                    type="number"
                    disabled={isViewer}
                    value={trueCost}
                    onChange={(e) => setTrueCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded py-2 pl-9 pr-3 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">True Actual Effort (Person-Days)</label>
                <input
                  id="actual-effort-input"
                  type="number"
                  disabled={isViewer}
                  value={trueEffort}
                  onChange={(e) => setTrueEffort(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">True Actual Duration (months)</label>
                <input
                  id="actual-duration-input"
                  type="number"
                  disabled={isViewer}
                  value={trueDuration}
                  onChange={(e) => setTrueDuration(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {!isViewer && (
              <div className="text-right">
                <button
                  id="actuals-save-btn"
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-5 rounded-lg shadow cursor-pointer ml-auto"
                >
                  Save Historical Actuals
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* SECTION 4: STEP-BY-STEP OVERHEADS SIZING WALKTHROUGH */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-sans">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4.5 h-4.5 text-indigo-650 animate-pulse" />
            <span className="font-sans font-extrabold text-xs text-slate-800 uppercase tracking-wider">Step-by-Step Overheads Sizing Walkthrough</span>
          </div>
          <span className="text-[10px] bg-slate-200/60 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-tight">Logical Audit Engine</span>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-650 leading-relaxed font-sans">
            <h5 className="font-bold text-slate-800 flex items-center gap-1">
              <span>🧮 Mathematical formula of Overhead Adjustments:</span>
            </h5>
            <p>
              To derive the final **Adjusted Sizing Metric** from unadjusted/base values, the system evaluates all enabled non-functional overhead factors. Each active overhead acts of a percentage impact over the base functional size points:
            </p>
            <div className="bg-white border border-slate-150 p-3 rounded font-mono text-[11px] text-indigo-905 font-bold text-center shadow-xs">
              Adjusted Sizing Points = Base Points × [ 1 + ( Σ Active Overheads % ) / 100 ]
            </div>
            <p className="text-[11px] text-slate-500">
              This process is calculated independently for each methodological framework (FPA, COSMIC, and Hybrid MCDA) depending on which models the overhead targets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FPA walkthrough */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-xs">
              <div className="border-b pb-2 border-slate-100">
                <span className="font-extrabold text-slate-850 text-xs block">Function Point Analysis (FPA)</span>
                <span className="text-[10px] text-slate-400">Model target: Adjusted Function Points (AFP)</span>
              </div>
              <div className="space-y-3 text-[11px] text-slate-600">
                <div className="flex justify-between font-semibold text-slate-700 bg-slate-50 p-2 rounded">
                  <span>Base Unadjusted Points:</span>
                  <span className="font-mono text-slate-900">{fpaBasePoints.toFixed(1)} UFP</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider select-none">Active Multipliers:</span>
                  <ul className="space-y-1 bg-slate-50/40 p-2.5 rounded border border-slate-100 max-h-48 overflow-y-auto">
                    {overheadsList.filter(o => o.is_active && (o.applies_to?.fpa ?? true)).map(oh => {
                      const pointsAdded = (fpaBasePoints * oh.value) / 100;
                      return (
                        <li key={oh.id} className="flex justify-between border-l-2 pl-2 border-indigo-200 text-slate-500 py-0.5">
                          <span className="truncate max-w-[140px] font-medium">{oh.name}:</span>
                          <span className="font-mono font-bold text-indigo-700">
                            +{pointsAdded.toFixed(1)} pts ({oh.value}%)
                          </span>
                        </li>
                      );
                    })}
                    {overheadsList.filter(o => o.is_active && (o.applies_to?.fpa ?? true)).length === 0 && (
                      <li className="text-slate-400 italic text-[10px] text-center">No active overheads applied</li>
                    )}
                  </ul>
                </div>
                <div className="border-t pt-3 flex justify-between font-extrabold text-slate-900 text-xs bg-slate-50 p-2 rounded">
                  <span>Total Adjusted Points:</span>
                  <span className="font-mono text-indigo-700">{fpaTotalPoints.toFixed(1)} AFP</span>
                </div>
              </div>
            </div>

            {/* COSMIC walkthrough */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-xs">
              <div className="border-b pb-2 border-slate-100">
                <span className="font-extrabold text-slate-855 text-xs block">COSMIC ISO-19761 Matrix</span>
                <span className="text-[10px] text-slate-400">Model target: COSMIC Function Points (CFP)</span>
              </div>
              <div className="space-y-3 text-[11px] text-slate-600">
                <div className="flex justify-between font-semibold text-slate-700 bg-slate-50 p-2 rounded">
                  <span>Base movements Points:</span>
                  <span className="font-mono text-slate-900">{cosmicBasePoints.toFixed(1)} CFP</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider select-none">Active Multipliers:</span>
                  <ul className="space-y-1 bg-slate-50/40 p-2.5 rounded border border-slate-100 max-h-48 overflow-y-auto">
                    {overheadsList.filter(o => o.is_active && (o.applies_to?.cosmic ?? true)).map(oh => {
                      const pointsAdded = (cosmicBasePoints * oh.value) / 100;
                      return (
                        <li key={oh.id} className="flex justify-between border-l-2 pl-2 border-teal-200 text-slate-500 py-0.5">
                          <span className="truncate max-w-[140px] font-medium">{oh.name}:</span>
                          <span className="font-mono font-bold text-teal-700">
                            +{pointsAdded.toFixed(1)} pts ({oh.value}%)
                          </span>
                        </li>
                      );
                    })}
                    {overheadsList.filter(o => o.is_active && (o.applies_to?.cosmic ?? true)).length === 0 && (
                      <li className="text-slate-400 italic text-[10px] text-center">No active overheads applied</li>
                    )}
                  </ul>
                </div>
                <div className="border-t pt-3 flex justify-between font-extrabold text-slate-900 text-xs bg-slate-50 p-2 rounded">
                  <span>Total Adjusted Points:</span>
                  <span className="font-mono text-teal-700">{cosmicTotalPoints.toFixed(1)} CFP</span>
                </div>
              </div>
            </div>

            {/* Hybrid MCDA walkthrough */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-xs">
              <div className="border-b pb-2 border-slate-100">
                <span className="font-extrabold text-slate-855 text-xs block">Integrated Hybrid MCDA</span>
                <span className="text-[10px] text-slate-400">Model target: Hybrid Function Points (HFP)</span>
              </div>
              <div className="space-y-3 text-[11px] text-slate-600">
                <div className="flex justify-between font-semibold text-slate-700 bg-slate-50 p-2 rounded">
                  <span>Base Weighted Points:</span>
                  <span className="font-mono text-slate-900">{hybridBasePoints.toFixed(1)} HFP</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider select-none">Active Multipliers:</span>
                  <ul className="space-y-1 bg-slate-50/40 p-2.5 rounded border border-slate-100 max-h-48 overflow-y-auto">
                    {overheadsList.filter(o => o.is_active && (o.applies_to?.hybrid ?? true)).map(oh => {
                      const pointsAdded = (hybridBasePoints * oh.value) / 100;
                      return (
                        <li key={oh.id} className="flex justify-between border-l-2 pl-2 border-violet-200 text-slate-500 py-0.5">
                          <span className="truncate max-w-[140px] font-medium">{oh.name}:</span>
                          <span className="font-mono font-bold text-violet-700">
                            +{pointsAdded.toFixed(1)} pts ({oh.value}%)
                          </span>
                        </li>
                      );
                    })}
                    {overheadsList.filter(o => o.is_active && (o.applies_to?.hybrid ?? true)).length === 0 && (
                      <li className="text-slate-400 italic text-[10px] text-center">No active overheads applied</li>
                    )}
                  </ul>
                </div>
                <div className="border-t pt-3 flex justify-between font-extrabold text-slate-900 text-xs bg-slate-50 p-2 rounded">
                  <span>Total Adjusted Points:</span>
                  <span className="font-mono text-violet-700">{hybridTotalPoints.toFixed(1)} HFP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Feedback form & Timeline audits - SECTION C */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Form review write panel */}
        {!isViewer && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4.5 h-4.5 text-indigo-650" />
              <h4 className="font-sans font-extrabold text-xs text-slate-800 tracking-tight">Post-Analysis Review</h4>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="space-y-3.5 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Review Subject Summary</label>
                <input
                  id="feedback-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. FPA and COSMIC calibrations"
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Estimator Confidence Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 text-slate-350 hover:text-amber-500 transition"
                    >
                      <Star className={`w-5 h-5 ${s <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-250'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Review Feedbacks / Comments</label>
                <textarea
                  id="feedback-comment"
                  required
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Draft precise notes about how calibration ratios aligned to final engineering values..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none resize-none"
                />
              </div>

              <button
                id="feedback-submit-btn"
                type="submit"
                disabled={submittingFeedback}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded shadow-xs transition cursor-pointer"
              >
                Log Estimator Feedback
              </button>
            </form>
          </div>
        )}

        {/* Right timeline feedback items log */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 max-h-[420px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <BookmarkCheck className="w-4.5 h-4.5 text-slate-650" />
            <h4 className="font-sans font-extrabold text-xs text-slate-800 tracking-tight">Estimator Revision Audit Log</h4>
          </div>

          <div className="space-y-3.5">
            {feedbackList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 select-none font-sans text-xs">
                No peer calibration reviews recorded yet for this project scope.
              </div>
            ) : (
              feedbackList.map((f, idx) => (
                <div key={f.id || idx} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between items-center bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500">
                    <span>{f.estimator_name || 'Umesh S.'}</span>
                    <span>{new Date(f.created_at).toLocaleDateString()} at {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800">{f.subject}</span>
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: f.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-550 leading-relaxed italic">"{f.review_comment}"</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
