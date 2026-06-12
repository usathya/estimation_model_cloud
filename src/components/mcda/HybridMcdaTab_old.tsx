import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { calculateHybridTotalMetrics, calculateHybridScoreForStory, calculateStoryPointsFromUserStory, calculateOverheadImpacts } from '../../lib/engines.js';
import {
  BarChart,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Briefcase,
  Calendar,
  Layers2,
  Table,
  CheckCircle,
  Plus,
  Trash2,
  X,
  Check,
  ScrollText,
  Sparkles,
  Loader2
} from 'lucide-react';
import { SaudiRiyalIcon } from '../icons/SaudiRiyalIcon.js';

interface EditablePercentDropdownProps {
  value: number;
  maxAllowed: number;
  onChange: (val: number) => void;
  disabled: boolean;
  step?: number;
}

function EditablePercentDropdown({
  value,
  maxAllowed,
  onChange,
  disabled,
  step = 5
}: EditablePercentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if value updates from parent
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate options in increments of step up to maxAllowed
  const options: number[] = [];
  for (let i = 0; i <= maxAllowed; i += step) {
    options.push(i);
  }
  // Make sure maxAllowed is in options if not already
  if (maxAllowed >= 0 && !options.includes(maxAllowed)) {
    options.push(maxAllowed);
  }
  // Make sure current value is in options if not already
  if (value > 0 && value <= maxAllowed && !options.includes(value)) {
    options.push(value);
  }
  options.sort((a, b) => a - b);

  const handleInputBlur = () => {
    let val = parseInt(inputValue, 10);
    if (isNaN(val) || val < 0) {
      val = 0;
    }
    if (val > maxAllowed) {
      val = maxAllowed;
    }
    onChange(val);
    setInputValue(val.toString());
  };

  return (
    <div ref={containerRef} className="relative w-full font-sans select-none">
      <div className="flex bg-slate-50 border border-slate-200 hover:border-slate-350 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/30 rounded-lg overflow-hidden transition-all duration-150">
        <input
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => {
            // Allow numeric inputs or empty temporary state
            const targetVal = e.target.value.replace(/\D/g, '');
            setInputValue(targetVal);
            if (targetVal !== '') {
              let val = parseInt(targetVal, 10);
              if (val > maxAllowed) val = maxAllowed;
              onChange(val);
            } else {
              onChange(0);
            }
          }}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInputBlur();
              setIsOpen(false);
            }
          }}
          className="w-full bg-transparent px-3 py-1.5 text-xs font-mono font-bold text-teal-650 outline-none text-left"
          placeholder="0"
        />
        <div className="flex items-center pr-2 shrink-0 gap-1 bg-transparent border-l border-slate-100 pl-1.5 my-1">
          <span className="text-[10px] font-bold text-slate-400 font-mono">%</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-slate-650 p-0.5 cursor-pointer flex items-center justify-center"
            >
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-150 text-slate-400"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 bottom-full mb-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-xs text-slate-700 animate-fade-in divide-y divide-slate-50">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setInputValue(option.toString());
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-mono flex justify-between items-center transition cursor-pointer ${value === option ? 'bg-teal-50/50 text-teal-650 font-bold' : ''
                }`}
            >
              <span>{option}%</span>
              {value === option && <Check className="w-3 h-3 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HybridMcdaTab() {
  const { currentProject, setProjectScope, saveCriterion, deleteCriterion, saveHybridScore, saveOverhead } = useProject();
  const { isViewer } = useAuth();

  const [isWeightsOpen, setIsWeightsOpen] = useState(true);

  // AI Elaboration from within Hybrid MCDA Tab
  const [isElabOpen, setIsElabOpen] = useState(false);
  const [elaborateStory, setElaborateStory] = useState<any>(null);
  const [isGeneratingElab, setIsGeneratingElab] = useState(false);
  const [elabText, setElabText] = useState('');

  const handleViewElaboration = (story: any) => {
    setElaborateStory(story);
    setElabText(story.elaboration_text || '');
    setIsElabOpen(true);
    setIsGeneratingElab(false);
  };

  const handleTriggerElaborateInHybrid = async (story: any) => {
    setElaborateStory(story);
    setIsElabOpen(true);
    setIsGeneratingElab(true);
    setElabText('');
    try {
      const res = await fetch(`/api/stories/${story.id}/elaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setElabText(data.elaboration);
        // Refresh project context
        setProjectScope((prev: any) => ({
          ...prev,
          stories: prev.stories.map((s: any) => s.id === story.id ? { ...s, elaboration_text: data.elaboration } : s)
        }));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to generate');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingElab(false);
    }
  };

  // Add Criterion Inline Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritWeight, setNewCritWeight] = useState(0);
  const [errorWord, setErrorWord] = useState('');
  const [deletingCrit, setDeletingCrit] = useState<{ id: string; name: string } | null>(null);

  // Load calculations
  const metrics = calculateHybridTotalMetrics(
    currentProject.stories,
    currentProject.criteria,
    currentProject.scores,
    currentProject.overheads
  );

  if (!currentProject.project) {
    return (
      <div className="max-w-2xl mx-auto p-8 my-10 bg-white border border-slate-200 rounded-xl shadow-xs text-center select-none animate-fade-in font-sans">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-2">Select a Proposal</h3>
        <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Please select an active project proposal first from the <strong className="text-slate-700">Project proposals</strong> main menu tab to configure composite MCDA criteria weightings and score stories.
        </p>
      </div>
    );
  }

  const teamSize = currentProject.project?.team_size ?? 5;
  const prodRate = currentProject.costConfig?.hybrid_productivity_rate ?? 1.5;
  const workDays = currentProject.costConfig?.working_days_per_month ?? 22;
  const pointCost = currentProject.costConfig?.hybrid_cost_per_point ?? 1875;

  const overheadsList = currentProject.overheads || [];
  const ohImpacts = calculateOverheadImpacts(overheadsList, 0, 0, metrics.totalHybridFp);
  const hybridTotalPoints = Math.round((metrics.totalHybridFp + ohImpacts.hybridOhPoints) * 100) / 100;

  const activeOverheadsForHybrid = overheadsList.filter(oh => oh.is_active && (oh.applies_to?.hybrid ?? true));
  const totalOverheadPercent = activeOverheadsForHybrid.reduce((sum, oh) => sum + (oh.method === 'percentage' ? oh.value : 0), 0);

  const hybridBaseCost = metrics.totalHybridFp * pointCost;
  const hybridGrandTotalCost = hybridTotalPoints * pointCost;
  const hybridEffort = Math.round((hybridTotalPoints / prodRate) * 10) / 10;
  const hybridDuration = teamSize > 0 ? Math.round((hybridEffort / teamSize / workDays) * 10) / 10 : 0;

  // Weight Change Handler (prevent individual weight exceeding 100%)
  const handleWeightChange = async (criterionId: string, value: number) => {
    if (isViewer) return;
    const criterion = currentProject.criteria.find(c => c.id === criterionId);
    if (!criterion) return;

    // Allow user to temporarily exceed total 100% during transition, capped individually at 100%
    const safeValue = Math.min(Math.max(0, value), 100);

    await saveCriterion({
      ...criterion,
      weight_percent: safeValue
    });
  };

  // Auto-distributor/Equalize Weights
  const handleEqualizeWeights = async () => {
    if (isViewer || currentProject.criteria.length === 0) return;
    const count = currentProject.criteria.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 % count;

    const promises = currentProject.criteria.map((crit, index) => {
      const assignedWeight = baseWeight + (index < remainder ? 1 : 0);
      return saveCriterion({
        ...crit,
        weight_percent: assignedWeight
      });
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error('Error equalizing weights:', err);
    }
  };

  // Add New Criterion
  const handleSaveNewCriterion = async () => {
    if (!newCritName.trim()) {
      setErrorWord('Name is required');
      return;
    }

    if (newCritWeight > 100 || newCritWeight < 0) {
      setErrorWord('Weight must be between 0% and 100%');
      return;
    }

    try {
      await saveCriterion({
        id: '', // Server will create standard UUID
        project_id: currentProject.project?.id || '',
        name: newCritName.trim(),
        description: newCritDesc.trim() || 'Custom functional criteria indicator',
        weight_percent: newCritWeight,
        max_score: 5,
        sort_order: currentProject.criteria.length + 1
      });
      handleCloseForm();
    } catch (e) {
      console.error(e);
      setErrorWord('Failed to save criterion');
    }
  };

  // Delete Criterion
  const handleDeleteCriterion = (criterionId: string, name: string) => {
    if (isViewer) return;
    setDeletingCrit({ id: criterionId, name });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setNewCritName('');
    setNewCritDesc('');
    setNewCritWeight(0);
    setErrorWord('');
  };

  // Score Change Handler
  const handleScoreChange = async (storyId: string, criterionId: string, rating: number) => {
    if (isViewer) return;
    const existingScore = currentProject.scores.find(
      s => s.story_id === storyId && s.criterion_id === criterionId
    );
    await saveHybridScore({
      id: existingScore?.id || '',
      story_id: storyId,
      criterion_id: criterionId,
      score: rating,
      is_ai_suggested: false
    });
  };

  // Agile Fibonacci Story Point Change Handler
  const handleAgilePointsChange = async (storyId: string, pts: number) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_points: pts, ai_status: 'overridden' })
      });
      if (res.ok) {
        setProjectScope(prev => ({
          ...prev,
          stories: prev.stories.map(s => s.id === storyId ? { ...s, story_points: pts, ai_status: 'overridden' } : s)
        }));
      }
    } catch (err) {
      console.error('Error updating story points:', err);
    }
  };



  const weightsSum = currentProject.criteria.reduce((sum, c) => sum + Number(c.weight_percent || 0), 0);
  const isWeightsValid = weightsSum === 100;

  // Rating color map helper
  const getRatingColor = (score: number) => {
    if (score >= 4.0) return 'text-emerald-700 bg-emerald-50';
    if (score >= 2.5) return 'text-sky-700 bg-sky-50';
    return 'text-amber-700 bg-amber-50';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">

      {/* Metrics Banner */}
      <div id="hybrid-cost-cards-strip" className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-650">
            <Layers2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Hybrid Metric Index</span>
            <span id="hybrid-total-hfp" className="text-xl font-extrabold text-slate-800">{hybridTotalPoints.toFixed(1)} HFP</span>
            <span className="text-[9px] font-sans text-slate-400 block">Composite MCDA {ohImpacts.hybridOhPoints > 0 ? `(+${ohImpacts.hybridOhPoints.toFixed(1)} OH)` : 'score'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Estimated Effort</span>
            <span id="hybrid-total-effort" className="text-xl font-extrabold text-slate-800">{hybridEffort} days</span>
            <span className="text-[9px] font-sans text-slate-400 block">Productivity: {prodRate} pts/day</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Est Schedule Duration</span>
            <span id="hybrid-total-duration" className="text-xl font-extrabold text-slate-800">{hybridDuration} months</span>
            <span className="text-[9px] font-sans text-slate-400 block">Team: {teamSize} resources</span>
          </div>
        </div>
      </div>

      {/* Criteria Weightings Collapsible Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div
          onClick={() => setIsWeightsOpen(!isWeightsOpen)}
          className="w-full bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4.5 h-4.5 text-teal-600" />
            <span className="font-sans font-extrabold text-xs text-slate-700">MCDA Multi-Criteria Weightings Customizer</span>
          </div>
          <div className="flex items-center gap-3">
            {!isViewer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWeightsOpen(true);
                  setIsFormOpen(true);
                  setNewCritWeight(Math.min(10, 100 - weightsSum));
                }}
                className="text-[10px] font-sans font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors px-2 py-0.5 rounded cursor-pointer leading-tight mr-1 flex items-center gap-0.5"
                title="Add a custom MCDA weighting criterion"
              >
                <Plus className="w-3 h-3" /> Add Criterion
              </button>
            )}
            {!isViewer && currentProject.criteria.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEqualizeWeights();
                }}
                className="text-[10px] font-sans font-bold bg-slate-200 hover:bg-slate-350 text-slate-700 hover:text-slate-900 transition-colors px-2 py-0.5 rounded cursor-pointer leading-tight mr-1"
                title="Redistribute remaining percentage equally among all criteria to sum to exactly 100%"
              >
                Equalize Weights
              </button>
            )}
            <span
              id="mcda-sum-weight-badge"
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded flex items-center gap-1.5 transition-colors duration-155 select-none ${isWeightsValid ? 'bg-emerald-100 text-emerald-855' : 'bg-rose-100 text-rose-800'
                }`}
            >
              <span>Weights: {weightsSum}% / 100%</span>
              {!isWeightsValid && <span className="animate-pulse">⚠️</span>}
              {isWeightsValid && <span className="text-emerald-700">✓</span>}
            </span>
            {isWeightsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {isWeightsOpen && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans text-slate-650 bg-slate-50/50">
            {currentProject.criteria.map((crit) => {
              const activeWeight = crit.weight_percent || 0;
              const otherWeightsSum = currentProject.criteria
                .filter(c => c.id !== crit.id)
                .reduce((sum, c) => sum + Number(c.weight_percent || 0), 0);
              const maxAllowedForThis = Math.max(0, 100 - otherWeightsSum);

              return (
                <div key={crit.id} className="relative bg-white border border-slate-200 p-3 rounded-lg flex flex-col justify-between min-h-[140px] group transition-all hover:border-slate-300 shadow-2xs">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <h5 className="font-sans font-bold text-xs text-slate-700 mb-0.5 leading-tight">{crit.name}</h5>
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCriterion(crit.id, crit.name)}
                          className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded p-1 transition opacity-100 md:opacity-0 group-hover:opacity-100"
                          title={`Delete ${crit.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3 leading-relaxed min-h-[30px]">{crit.description}</p>
                  </div>
                  <div className="mt-auto space-y-1 w-full text-left">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 uppercase">
                      <span>Weight</span>
                      {activeWeight === maxAllowedForThis && activeWeight > 0 && (
                        <span className="text-amber-600 font-extrabold text-[9px] animate-pulse">Max Cap</span>
                      )}
                    </div>
                    <EditablePercentDropdown
                      value={activeWeight}
                      maxAllowed={100}
                      step={5}
                      disabled={isViewer}
                      onChange={(val) => handleWeightChange(crit.id, val)}
                    />
                  </div>
                </div>
              );
            })}

            {/* Quick Inline "+ Add Criterion" trigger and form */}
            {!isViewer && !isFormOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(true);
                  // Default weight to whatever can fit, capping naturally
                  setNewCritWeight(Math.min(10, 100 - weightsSum));
                }}
                className="bg-slate-100/50 border border-slate-350 border-dashed hover:border-teal-500 hover:bg-slate-50 transition duration-150 rounded-lg flex flex-col justify-center items-center min-h-[140px] text-center p-4 cursor-pointer group"
              >
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-teal-650 mb-1.5 transition-colors" />
                <span className="font-extrabold text-slate-750 text-xs">Add Criterion</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Configure additional custom MCDA weighting</span>
              </button>
            )}

            {isFormOpen && (
              <div className="bg-white border border-teal-500 ring-1 ring-teal-500/30 p-3 rounded-lg flex flex-col justify-between min-h-[140px] shadow-sm animate-fade-in relative text-xs">
                <button
                  type="button"
                  onClick={() => handleCloseForm()}
                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition"
                  title="Close form"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-2">
                  <h6 className="font-bold text-xs text-teal-700 pr-4">New Custom Criterion</h6>

                  {/* Name field */}
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Criterion Name</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 focus:border-teal-500 outline-none focus:ring-1 focus:ring-teal-500 rounded px-2 py-1 text-xs"
                      placeholder="e.g. Scalability"
                      value={newCritName}
                      onChange={(e) => {
                        setNewCritName(e.target.value);
                        setErrorWord('');
                      }}
                    />
                  </div>

                  {/* Description field */}
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Short Description</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 focus:border-teal-500 outline-none focus:ring-1 focus:ring-teal-500 rounded px-2 py-1 text-[10px]"
                      placeholder="e.g. Microservices ready, scale horizontal"
                      value={newCritDesc}
                      onChange={(e) => {
                        setNewCritDesc(e.target.value);
                        setErrorWord('');
                      }}
                    />
                  </div>

                  {/* Initial weight field */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 uppercase">
                      <span>Initial Weight</span>
                    </div>
                    <EditablePercentDropdown
                      value={newCritWeight}
                      maxAllowed={100}
                      step={5}
                      disabled={false}
                      onChange={(val) => {
                        setNewCritWeight(val);
                        setErrorWord('');
                      }}
                    />
                  </div>

                  {errorWord && (
                    <p className="text-[9px] text-rose-500 font-semibold leading-none">{errorWord}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSaveNewCriterion()}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-2.5 rounded text-[10px] cursor-pointer transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseForm()}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-1.5 px-2.5 rounded text-[10px] cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Scoring Matrix GRID */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="w-4.5 h-4.5 text-slate-600" />
            <h4 className="font-sans font-extrabold text-xs text-slate-700">MCDA Requirement Scoring Matrix</h4>
          </div>
          <span className="text-[10px] font-sans text-slate-400">Identify complexity via MCDA, and score actual points using Fibonacci story points.</span>
        </div>

        <div className="overflow-x-auto w-full">
          {currentProject.stories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 select-none">
              <Table className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-semibold">No requirement logs synchronized.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-slate-650 text-center">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-mono uppercase text-slate-500">
                  <th className="py-3 px-4 w-28 text-left">Requirement ID</th>
                  <th className="py-3 px-3 text-left">Functional Goal</th>
                  {currentProject.criteria.map(crit => (
                    <th key={crit.id} className="py-3 px-2 w-24 font-mono font-bold text-[10px]" title={crit.description}>
                      {crit.name}
                    </th>
                  ))}
                  <th className="py-3 px-2 w-28 font-mono font-bold text-[10px]">MCDA Score</th>
                  <th className="py-3 px-2 w-28 font-mono font-bold text-[10px]">Complexity</th>
                  <th className="py-3 px-3 w-36 font-sans font-extrabold bg-slate-100 text-slate-800">Agile Story Points (Fibonacci)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {currentProject.stories.map((story) => {
                  const { weightedScore, complexity } = calculateHybridScoreForStory(story.id, currentProject.criteria, currentProject.scores);
                  const selectedStoryPoints = story.story_points !== undefined && story.story_points !== null ? story.story_points : calculateStoryPointsFromUserStory(story);

                  // Determining the estimation algorithm source
                  const classif = currentProject.classifications?.find(c => c.story_id === story.id && c.model_type === 'hybrid');
                  const provider = classif?.ai_provider || '';

                  let badgeLabel = 'Heuristic';
                  let badgeColors = 'bg-slate-55 text-slate-500 border-slate-200';

                  if (story.ai_status === 'overridden') {
                    badgeLabel = '👤 User Override';
                    badgeColors = 'bg-indigo-50 text-indigo-700 border border-indigo-150';
                  } else if (story.ai_status === 'classified' || story.ai_status === 'flagged') {
                    if (provider === 'gemini') {
                      badgeLabel = '🤖 Gemini AI';
                      badgeColors = 'bg-emerald-50 text-emerald-700 border border-emerald-150';
                    } else if (provider === 'gemini-fallback') {
                      badgeLabel = '🤖 AI Fallback';
                      badgeColors = 'bg-amber-50 text-amber-700 border border-amber-150';
                    } else if (provider === 'local-estimator') {
                      badgeLabel = '⚙️ Heuristic Engine';
                      badgeColors = 'bg-slate-50 text-slate-605 border border-slate-200';
                    } else {
                      badgeLabel = '🤖 AI Predicted';
                      badgeColors = 'bg-emerald-50 text-emerald-750 border border-emerald-150';
                    }
                  } else {
                    badgeLabel = '⚙️ Heuristic';
                    badgeColors = 'bg-slate-50 text-slate-500 border border-slate-150';
                  }

                  return (
                    <tr key={story.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2 px-4 font-semibold text-slate-900 text-left">{story.story_id}</td>
                      <td className="py-2 px-3 text-slate-500 text-left max-w-[200px]" title={story.goal}>
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="truncate block" title={story.goal}>{story.goal}</span>
                          {story.elaboration_text ? (
                            <button
                              onClick={() => handleViewElaboration(story)}
                              title="Read Detailed AI Elaboration Spec"
                              className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 transition cursor-pointer shrink-0"
                            >
                              <ScrollText className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTriggerElaborateInHybrid(story)}
                              title="Create AI Elaboration Spec before estimating"
                              className="text-slate-300 hover:text-purple-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      {currentProject.criteria.map((crit) => {
                        const scoreRec = currentProject.scores.find(s => s.story_id === story.id && s.criterion_id === crit.id);
                        const ratingVal = scoreRec ? scoreRec.score : 0;
                        return (
                          <td key={crit.id} className="py-2 px-1">
                            <select
                              id={`mcda-cell-${story.id}-${crit.id}`}
                              disabled={isViewer}
                              value={ratingVal}
                              onChange={(e) => handleScoreChange(story.id, crit.id, Number(e.target.value))}
                              className="bg-slate-50/80 border border-slate-150 py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer max-w-[55px]"
                            >
                              <option value="0">0</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                            </select>
                          </td>
                        );
                      })}

                      {/* MCDA Score out of 100 */}
                      <td className="py-2 px-2 font-semibold font-mono text-slate-700">
                        {weightedScore.toFixed(1)}%
                      </td>

                      {/* Identified Complexity (Simple vs Complex) */}
                      <td className="py-2 px-2">
                        {complexity === 'Complex' ? (
                          <span className="inline-block bg-rose-50 text-rose-700 border border-rose-150 px-2 py-0.5 rounded text-[10px] font-bold">Complex</span>
                        ) : (
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded text-[10px] font-bold">Simple</span>
                        )}
                      </td>

                      {/* Editable Agile Story Points using Fibonacci series with visual Engine identifier */}
                      <td className="py-2 px-3 bg-slate-100/50 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <select
                            disabled={isViewer}
                            value={selectedStoryPoints}
                            onChange={(e) => handleAgilePointsChange(story.id, Number(e.target.value))}
                            className="bg-white border border-slate-350 py-1 px-2.5 rounded-lg text-xs font-extrabold cursor-pointer text-indigo-750 focus:border-indigo-550 focus:outline-none min-w-[75px] text-center"
                          >
                            <option value="1">1 pt</option>
                            <option value="2">2 pts</option>
                            <option value="3">3 pts</option>
                            <option value="5">5 pts</option>
                            <option value="8">8 pts</option>
                            <option value="13">13 pts</option>
                            <option value="21">21 pts</option>
                          </select>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${badgeColors}`}>
                            {badgeLabel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>



      {deletingCrit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-sm w-full mx-4 shadow-xl text-left">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Confirm Deletion
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Are you sure you want to delete <strong className="text-slate-705">"{deletingCrit.name}"</strong>? This will permanently remove its weight allocations and ratings.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  await deleteCriterion(deletingCrit.id);
                  setDeletingCrit(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs cursor-pointer text-center transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setDeletingCrit(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-3 rounded-lg text-xs cursor-pointer text-center transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive AI Elaboration Modal within scoring matrix */}
      {isElabOpen && elaborateStory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl flex flex-col max-h-[80vh] text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-purple-650" />
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-slate-800">
                    Requirement Specifications: {elaborateStory.story_id}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Review functional details and acceptance criteria before assigning points
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsElabOpen(false)}
                className="text-slate-400 hover:text-slate-650 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 mb-4 bg-slate-50 border border-slate-150 rounded-lg p-5">
              {isGeneratingElab ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600 animate-pulse text-center">
                    Gemini 3.5-flash is drafting acceptance criteria & technical details...
                  </p>
                </div>
              ) : elabText ? (
                <div className="prose prose-xs max-w-none text-slate-705 leading-relaxed text-xs">
                  <ReactMarkdown>{elabText}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-450">
                  <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-medium mb-4">No specifications currently exist for this requirement.</p>
                  <button
                    onClick={() => handleTriggerElaborateInHybrid(elaborateStory)}
                    className="bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer"
                  >
                    Generate Detailed Spec with AI
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[10px] text-slate-400 font-mono">
                Powered by Gemini Pro
              </span>
              <div className="flex gap-2">
                {elabText && !isGeneratingElab && (
                  <button
                    onClick={() => handleTriggerElaborateInHybrid(elaborateStory)}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition border border-purple-150"
                  >
                    Re-generate Specification
                  </button>
                )}
                <button
                  onClick={() => setIsElabOpen(false)}
                  className="bg-slate-100 hover:bg-slate-150 text-slate-705 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
