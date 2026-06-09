import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { calculateCosmicTotalMetrics, calculateFpaTotalMetrics, calculateOverheadImpacts } from '../../lib/engines.js';
import {
  Orbit,
  HelpCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  BarChart2,
  Briefcase,
  Calendar,
  FileCheck2,
  Layers
} from 'lucide-react';
import { SaudiRiyalIcon } from '../icons/SaudiRiyalIcon.js';

export default function CosmicTab() {
  const { currentProject, setProjectScope } = useProject();
  const { isViewer } = useAuth();

  const [isGuidanceOpen, setIsGuidanceOpen] = useState(true);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Form states to add custom movements to story processes
  const [newMovementName, setNewMovementName] = useState('');
  const [newMovementType, setNewMovementType] = useState<'Entry' | 'Exit' | 'Read' | 'Write'>('Entry');
  const [newMovementGroup, setNewMovementGroup] = useState('DataGroup');

  // Custom standalone process creation states
  const [isAddingStandalone, setIsAddingStandalone] = useState(false);
  const [standaloneId, setStandaloneId] = useState('');
  const [standaloneName, setStandaloneName] = useState('');
  const [standaloneGoal, setStandaloneGoal] = useState('');

  // Calculations
  const metrics = calculateCosmicTotalMetrics(currentProject.stories, currentProject.movements);

  if (!currentProject.project) {
    return (
      <div className="max-w-2xl mx-auto p-8 my-10 bg-white border border-slate-200 rounded-xl shadow-xs text-center select-none animate-fade-in font-sans">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-2">Select a Proposal</h3>
        <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Please select an active project proposal first from the <strong className="text-slate-700">Project proposals</strong> main menu tab to access and manage its COSMIC Points estimation model.
        </p>
      </div>
    );
  }

  const teamSize = currentProject.project?.team_size ?? 5;
  const prodRate = currentProject.costConfig?.cosmic_productivity_rate ?? 1.5;
  const workDays = currentProject.costConfig?.working_days_per_month ?? 22;
  const pointCost = currentProject.costConfig?.cosmic_cost_per_point ?? 1875;

  const overheadsList = currentProject.overheads || [];
  const ohImpacts = calculateOverheadImpacts(overheadsList, 0, metrics.totalCfp, 0);
  const cosmicTotalPoints = Math.round((metrics.totalCfp + ohImpacts.cosmicOhPoints) * 100) / 100;

  const cosmicBaseCost = cosmicTotalPoints * pointCost;
  const cosmicEffort = Math.round((cosmicTotalPoints / prodRate) * 10) / 10;
  const cosmicDuration = teamSize > 0 ? Math.round((cosmicEffort / teamSize / workDays) * 10) / 10 : 0;

  // Handlers to insert/delete movements
  const handleAddMovement = async (storyId: string) => {
    if (!newMovementName.trim() || isViewer) return;

    const payload = {
      story_id: storyId,
      name: newMovementName,
      movement_type: newMovementType,
      data_group: newMovementGroup,
      reasoning: 'Estimator appended custom movement step to structural process.',
      is_ai_generated: false
    };

    try {
      const res = await fetch('/api/cosmic_movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setProjectScope(prev => ({
          ...prev,
          movements: [...prev.movements, data]
        }));
        // Reset
        setNewMovementName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (isViewer) return;
    try {
      const res = await fetch(`/api/cosmic_movements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjectScope(prev => ({
          ...prev,
          movements: prev.movements.filter(m => m.id !== id)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStandaloneProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!standaloneName.trim() || !currentProject.project || isViewer) return;

    // Determine the next sequential PROC- ID base on existing standalone stories
    const existingProcNums = currentProject.stories
      .map(s => {
        const match = s.story_id?.match(/PROC-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const nextProcNum = existingProcNums.length > 0 ? Math.max(...existingProcNums) + 1 : 1;
    const finalProcId = standaloneId.trim() || `PROC-${String(nextProcNum).padStart(2, '0')}`;

    // Submitting a standalone work item story in DB (Source = 'manual' / stand)
    const payload = {
      project_id: currentProject.project.id,
      story_id: finalProcId,
      role: 'System',
      goal: standaloneGoal || standaloneName,
      benefit: 'Standalone metric execution',
      epic: 'Standalone Process',
      priority: 'Medium' as const,
      source: 'manual' as const,
      ai_status: 'classified' as const // instantly evaluated
    };

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const createdStory = data[0];

        // Insert at least 2 default Entry/Exit movements so it fulfills cosmic specs
        const defaults = [
          { story_id: createdStory.id, name: 'Process trigger', movement_type: 'Entry' as const, data_group: 'Command', reasoning: 'Process sequence initializer.', is_ai_generated: false },
          { story_id: createdStory.id, name: 'Process release', movement_type: 'Exit' as const, data_group: 'Response', reasoning: 'Process sequence output completion.', is_ai_generated: false }
        ];

        const freshMovements: any[] = [];
        for (const def of defaults) {
          const mRes = await fetch('/api/cosmic_movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(def)
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            freshMovements.push(mData);
          }
        }

        // Setup newly written classif as well as cosmic classifications to database
        await fetch(`/api/analyse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: createdStory.id,
            storyText: createdStory.goal,
            projectType: currentProject.project.project_type
          })
        });

        const detailRes = await fetch(`/api/projects/${currentProject.project.id}`);
        if (detailRes.ok) {
          const freshData = await detailRes.json();
          setProjectScope(prev => ({
            ...prev,
            stories: freshData.stories,
            movements: freshData.movements,
            classifications: freshData.classifications
          }));
        }

        // Reset
        setIsAddingStandalone(false);
        setStandaloneName('');
        setStandaloneId('');
        setStandaloneGoal('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Color selection helper
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Entry': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Exit': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Read': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Write': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const classifiedStories = currentProject.stories.filter(s => {
    const classif = currentProject.classifications.find(c => c.story_id === s.id && c.model_type === 'cosmic');
    return classif !== undefined;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">

      {/* Estimation metrics header */}
      <div id="cosmic-cost-metric-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-[#5C2D91]/10 p-2.5 rounded-lg text-[#5C2D91]">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Total COSMIC Points</span>
            <span id="cosmic-total-cfp" className="text-xl font-extrabold text-slate-800">{cosmicTotalPoints.toFixed(1)} CFP</span>
            <span className="text-[9px] font-sans text-slate-400 block">Total movements {ohImpacts.cosmicOhPoints > 0 ? `(+${ohImpacts.cosmicOhPoints.toFixed(1)} OH)` : 'evaluated'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Estimated Effort</span>
            <span id="cosmic-total-effort" className="text-xl font-extrabold text-slate-800">{cosmicEffort} days</span>
            <span className="text-[9px] font-sans text-slate-400 block">Rate: {prodRate} pts/day</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Estimated Duration</span>
            <span id="cosmic-total-duration" className="text-xl font-extrabold text-slate-800">{cosmicDuration} months</span>
            <span className="text-[9px] font-sans text-slate-400 block">Team: {teamSize} resources</span>
          </div>
        </div>
      </div>

      {/* Collapsible Guidance Matrix */}
      <div id="cosmic-guidance-card" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setIsGuidanceOpen(!isGuidanceOpen)}
          className="w-full bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4.5 h-4.5 text-slate-650" />
            <span className="font-sans font-extrabold text-xs text-slate-700">COSMIC Functional Size Measurement Standards (ISO 19761)</span>
          </div>
          {isGuidanceOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {isGuidanceOpen && (
          <div className="p-4 bg-slate-50/50 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans text-slate-600">
            <div className="border border-blue-200 bg-blue-50/20 p-3 rounded-lg">
              <span className="font-bold text-blue-700 block mb-1">Entry (E)</span>
              <span>Propagates data groups from user actor to functional process.</span>
            </div>
            <div className="border border-emerald-200 bg-emerald-50/20 p-3 rounded-lg">
              <span className="font-bold text-emerald-700 block mb-1">Exit (X)</span>
              <span>Propagates data groups from functional process back to user actor.</span>
            </div>
            <div className="border border-amber-200 bg-amber-50/20 p-3 rounded-lg">
              <span className="font-bold text-amber-700 block mb-1">Read (R)</span>
              <span>Fetches data attributes from internal resource storage.</span>
            </div>
            <div className="border border-rose-200 bg-rose-50/20 p-3 rounded-lg">
              <span className="font-bold text-rose-750 block mb-1">Write (W)</span>
              <span>Saves/writes data attributes permanently to storage.</span>
            </div>
          </div>
        )}
      </div>

      {/* Standalone process trigger button */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div>
          <h4 className="font-sans font-extrabold text-slate-800 text-xs leading-none mb-1">COSMIC System Boundary Scope</h4>
          <span className="text-[10px] font-sans text-slate-450">Measure standalone software boundaries not mapped directly to a user story.</span>
        </div>
        {!isViewer && (
          <button
            id="cosmic-standalone-btn"
            onClick={() => setIsAddingStandalone(!isAddingStandalone)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Standalone Process</span>
          </button>
        )}
      </div>

      {/* Standalone Process Form drawer */}
      {isAddingStandalone && (
        <form onSubmit={handleAddStandaloneProcess} className="bg-white border border-teal-500 rounded-xl p-5 shadow-lg space-y-4 text-xs font-sans animate-fade-in animate-slide-up">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="font-extrabold text-teal-700">New Independent COSMIC functional Process</span>
            <button type="button" onClick={() => setIsAddingStandalone(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-mono uppercase block text-slate-450 font-bold mb-1">Process ID</label>
              <input
                id="standalone-id"
                type="text"
                value={standaloneId}
                onChange={(e) => setStandaloneId(e.target.value)}
                placeholder="PROC-01"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-mono uppercase block text-slate-450 font-bold mb-1">Process Name *</label>
              <input
                id="standalone-name"
                type="text"
                required
                value={standaloneName}
                onChange={(e) => setStandaloneName(e.target.value)}
                placeholder="Background Database indexing"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
              />
            </div>
            <div className="col-span-3">
              <label className="text-[9px] font-mono uppercase block text-slate-450 font-bold mb-1">Process Goal/Objective</label>
              <input
                id="standalone-goal"
                type="text"
                value={standaloneGoal}
                onChange={(e) => setStandaloneGoal(e.target.value)}
                placeholder="Analyze story parameters and record index profiles automatically to maintain query speed..."
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded"
              />
            </div>
          </div>
          <div className="text-right">
            <button
              id="standalone-submit-btn"
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-5 rounded-lg shadow cursor-pointer ml-auto"
            >
              Confirm Standalone Process
            </button>
          </div>
        </form>
      )}

      {/* Process Cards - lists categorized movements */}
      <div className="space-y-4">
        {classifiedStories.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-400 select-none">
            <Orbit className="w-12 h-12 text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-semibold">No classified COSMIC Processes available yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Please trigger the AI Ingestion evaluation to auto-populate movements cards.</p>
          </div>
        ) : (
          classifiedStories.map((story) => {
            const storyMovements = currentProject.movements.filter(m => m.story_id === story.id);
            const isExpanded = expandedStoryId === story.id;
            const cfpBadgeVal = storyMovements.length;

            const cosmicClassif = currentProject.classifications.find(c => c.story_id === story.id && c.model_type === 'cosmic');
            const provider = cosmicClassif?.ai_provider || '';
            let providerLabel = 'Heuristic';
            let providerColors = 'bg-slate-50 text-slate-500 border-slate-200';

            if (story.ai_status === 'overridden') {
              providerLabel = '👤 Override';
              providerColors = 'bg-indigo-50 text-indigo-700 border border-indigo-150';
            } else if (story.ai_status === 'classified' || story.ai_status === 'flagged') {
              if (provider === 'gemini') {
                providerLabel = '🤖 Gemini AI';
                providerColors = 'bg-emerald-50 text-emerald-700 border border-emerald-150';
              } else if (provider === 'gemini-fallback') {
                providerLabel = '🤖 AI Fallback';
                providerColors = 'bg-amber-50 text-amber-700 border border-amber-150';
              } else if (provider === 'local-estimator') {
                providerLabel = '⚙️ Heuristic';
                providerColors = 'bg-slate-50 text-slate-600 border border-slate-200';
              } else {
                providerLabel = '🤖 AI Predicted';
                providerColors = 'bg-emerald-50 text-emerald-750 border border-emerald-110';
              }
            } else {
              providerLabel = '⚙️ Heuristic';
              providerColors = 'bg-slate-50 text-slate-500 border border-slate-150';
            }

            // Standardize confidence to percentage format (handles decimal 1.0/0.95 or integer 90/85)
            const displayConfidence = (() => {
              const confVal = (cosmicClassif?.classification as any)?.confidence !== undefined
                ? (cosmicClassif.classification as any).confidence
                : (cosmicClassif?.confidence !== undefined ? cosmicClassif.confidence : 90);
              return confVal <= 1 ? Math.round(confVal * 100) : Math.round(confVal);
            })();

            return (
              <div
                key={story.id}
                id={`cosmic-card-${story.id}`}
                className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
              >
                {/* Header card summary */}
                <div
                  onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                  className="px-6 py-4 flex hover:bg-slate-50/50 justify-between items-center flex-wrap gap-4 cursor-pointer select-none transition"
                >
                  <div className="flex items-center gap-3-col truncate flex-1 md:max-w-xl">
                    <span className="font-mono text-xs font-bold text-slate-450 px-2 py-1 bg-slate-100 rounded leading-none">
                      {story.story_id}
                    </span>
                    <div className="truncate text-left">
                      <span className="font-sans font-bold text-xs text-slate-800 leading-none block mb-1">
                        Functional state process: {story.goal}
                      </span>
                      <span className="text-[10px] font-sans text-slate-400">Epic Group: {story.epic}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${providerColors}`}>
                      {providerLabel}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded">
                      Confidence {displayConfidence}%
                    </span>
                    <span className="bg-[#5C2D91] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-inner leading-none shadow-black/10">
                      {cfpBadgeVal} CFP
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 animate-fade-in text-xs font-sans text-slate-600">

                    {/* Movements listing table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-650 text-left">
                        <thead>
                          <tr className="border-b border-slate-200 font-mono text-[9px] uppercase text-slate-500 bg-slate-50/50">
                            <th className="py-2 px-3 w-10 text-center">#</th>
                            <th className="py-2 px-3">Movement Step Name</th>
                            <th className="py-2 px-3 w-24 text-center">Movement Type</th>
                            <th className="py-2 px-3">Associated Data Group</th>
                            <th className="py-2 px-3">Analytical Reasoning Justification</th>
                            <th className="py-2 px-3 w-16 text-center">Source</th>
                            {!isViewer && <th className="py-2 px-3 w-12 text-center">Delete</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {storyMovements.map((mov, idx) => (
                            <tr key={mov.id}>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">{mov.name}</td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[9px] font-mono uppercase font-bold text-center w-full leading-none mr-2 ${getTypeColor(mov.movement_type)}`}>
                                  {mov.movement_type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{mov.data_group}</td>
                              <td className="py-2.5 px-3 text-slate-500 italic">"{mov.reasoning}"</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="text-[8px] font-semibold border border-slate-150 rounded px-1 text-slate-400">
                                  {mov.is_ai_generated ? 'AI' : 'Manual'}
                                </span>
                              </td>
                              {!isViewer && (
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleDeleteMovement(mov.id)}
                                    className="text-slate-400 hover:text-rose-600 transition p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Quick-add inline movement panel */}
                    {!isViewer && (
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                        <span className="font-sans font-bold text-slate-700 text-[11px] block">Quick Add Custom Data Movement Step</span>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[9px] font-mono uppercase block text-slate-400 mb-0.5">Step Name</label>
                            <input
                              type="text"
                              value={newMovementName}
                              onChange={(e) => setNewMovementName(e.target.value)}
                              placeholder="Validate login token payload"
                              className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono uppercase block text-slate-400 mb-0.5">Type</label>
                            <select
                              value={newMovementType}
                              onChange={(e: any) => setNewMovementType(e.target.value)}
                              className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs focus:outline-none cursor-pointer"
                            >
                              <option value="Entry">Entry (E) - Input</option>
                              <option value="Exit">Exit (X) - Output</option>
                              <option value="Read">Read (R) - Storage Fetch</option>
                              <option value="Write">Write (W) - Storage Record</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-mono uppercase block text-slate-400 mb-0.5">Data Group Attributes</label>
                            <input
                              type="text"
                              value={newMovementGroup}
                              onChange={(e) => setNewMovementGroup(e.target.value)}
                              placeholder="SessionVariables"
                              className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs focus:outline-none"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => handleAddMovement(story.id)}
                              className="w-full flex items-center justify-center gap-1 bg-teal-650 hover:bg-teal-700 text-white font-semibold text-xs py-2 rounded shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Insert Step</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Aggregate COSMIC Movements SUMMARY Table - SECTION C */}
      {metrics.breakdown.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <BarChart2 className="w-4.5 h-4.5 text-slate-650" />
            <span className="font-sans font-extrabold text-xs text-slate-700">COSMIC measurement Aggregate Summary Log</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs text-slate-650 text-left">
              <thead>
                <tr className="border-b border-slate-100 font-mono text-[9px] uppercase text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-3">Functional Process</th>
                  <th className="py-2.5 px-3 w-28">Story Key</th>
                  <th className="py-2.5 px-3 w-20 text-center">Entry (E)</th>
                  <th className="py-2.5 px-3 w-20 text-center">Exit (X)</th>
                  <th className="py-2.5 px-3 w-20 text-center">Read (R)</th>
                  <th className="py-2.5 px-3 w-20 text-center">Write (W)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Total CFP Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {metrics.breakdown.map((b) => (
                  <tr key={b.story_id}>
                    <td className="py-2.5 px-3 font-medium text-slate-800 truncate max-w-[280px]" title={b.goal}>
                      {b.goal}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{b.story_code}</td>
                    <td className="py-2.5 px-3 text-center text-blue-600 font-bold">{b.e}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{b.x}</td>
                    <td className="py-2.5 px-3 text-center text-amber-600 font-bold">{b.r}</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{b.w}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-slate-900 bg-slate-50/50">{b.cfp} CFP</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td className="py-3 px-3">Aggregate Grand Totals</td>
                  <td className="py-3 px-3">all Processes</td>
                  <td className="py-3 px-3 text-center text-blue-650 font-extrabold">{metrics.distribution.Entry}</td>
                  <td className="py-3 px-3 text-center text-emerald-650 font-extrabold">{metrics.distribution.Exit}</td>
                  <td className="py-3 px-3 text-center text-amber-650 font-extrabold">{metrics.distribution.Read}</td>
                  <td className="py-3 px-3 text-center text-rose-650 font-extrabold">{metrics.distribution.Write}</td>
                  <td className="py-3 px-3 text-center text-[#5C2D91] font-extrabold bg-slate-150">{metrics.totalCfp} CFP</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
