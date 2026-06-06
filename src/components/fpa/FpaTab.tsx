import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { calculateFpaComplexityAndPoints, calculateFpaTotalMetrics, calculateOverheadImpacts } from '../../lib/engines';
import { FpaClassification } from '../../types';
import { 
  Binary, 
  HelpCircle, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Flame,
  Briefcase,
  Calendar,
  Sparkles,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { SaudiRiyalIcon } from '../icons/SaudiRiyalIcon';

export default function FpaTab() {
  const { currentProject, setProjectScope, saveGscRating } = useProject();
  const { isViewer } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState<'data' | 'transactions' | 'gsc'>('data');
  const [overrideModalStory, setOverrideModalStory] = useState<any | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideValue, setOverrideValue] = useState('Low');

  // Load calculations
  const metrics = calculateFpaTotalMetrics(
    currentProject.stories,
    currentProject.classifications,
    currentProject.ratings
  );

  if (!currentProject.project) {
    return (
      <div className="max-w-2xl mx-auto p-8 my-10 bg-white border border-slate-200 rounded-xl shadow-xs text-center select-none animate-fade-in font-sans">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-2">Select a Proposal</h3>
        <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Please select an active project proposal first from the <strong className="text-slate-700">Project proposals</strong> main menu tab to access and manage its FPA estimation model.
        </p>
      </div>
    );
  }

  const dataStories = currentProject.stories.filter(s => {
    const classif = currentProject.classifications.find(c => c.story_id === s.id && c.model_type === 'fpa');
    const fType = (classif?.classification as FpaClassification)?.functionType;
    return fType === 'ILF' || fType === 'EIF';
  });

  const transactionStories = currentProject.stories.filter(s => {
    const classif = currentProject.classifications.find(c => c.story_id === s.id && c.model_type === 'fpa');
    const fType = (classif?.classification as FpaClassification)?.functionType;
    return fType === 'EI' || fType === 'EO' || fType === 'EQ';
  });

  // Handle inline parameter changes with debounce
  const handleParamChange = async (storyId: string, field: 'rets' | 'dets' | 'ftrs', value: number) => {
    if (isViewer) return;

    // Local update
    const updatedClassifs = currentProject.classifications.map(c => {
      if (c.story_id === storyId && c.model_type === 'fpa') {
        const cls = { ...c.classification as FpaClassification, [field]: value };
        // Recalculate
        const recalc = calculateFpaComplexityAndPoints(cls.functionType, cls.rets, cls.dets, cls.ftrs);
        cls.complexity = recalc.complexity;
        cls.unadjustedFP = recalc.fp;
        return { ...c, classification: cls };
      }
      return c;
    });

    setProjectScope(prev => ({
      ...prev,
      classifications: updatedClassifs
    }));

    // Find the classification to upsert to db
    const targetClassif = updatedClassifs.find(c => c.story_id === storyId && c.model_type === 'fpa');
    if (targetClassif) {
      await fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_status: 'overridden' })
      });
      // also upsert classification
      await fetch(`/api/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          storyText: currentProject.stories.find(x => x.id === storyId)?.goal || '',
          projectType: currentProject.project?.project_type
        })
      });
    }
  };

  // Override model
  const triggerOverride = (story: any, currentComp: string) => {
    setOverrideModalStory(story);
    setOverrideValue(currentComp);
    setOverrideReason('');
  };

  const submitOverride = async () => {
    if (!overrideModalStory || overrideReason.length < 20 || isViewer) {
      alert('You must provide a detailed explanation of at least 20 characters.');
      return;
    }

    try {
      const res = await fetch('/api/ai_overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: overrideModalStory.id,
          model_type: 'fpa',
          field_changed: 'complexity',
          original_value: (currentProject.classifications.find(c => c.story_id === overrideModalStory.id && c.model_type === 'fpa')?.classification as any)?.complexity || 'Average',
          override_value: overrideValue,
          reason: overrideReason
        })
      });

      if (res.ok) {
        // Change local context state
        const updatedClassifs = currentProject.classifications.map(c => {
          if (c.story_id === overrideModalStory.id && c.model_type === 'fpa') {
            const cls = { ...c.classification as FpaClassification };
            cls.complexity = overrideValue as any;
            cls.unadjustedFP = cls.functionType === 'ILF' 
              ? (overrideValue === 'Low' ? 7 : overrideValue === 'Average' ? 10 : 15)
              : (overrideValue === 'Low' ? 3 : overrideValue === 'Average' ? 4 : 6); // simple standard fallback rates mapped
            return { ...c, classification: cls };
          }
          return c;
        });

        setProjectScope(prev => ({
          ...prev,
          classifications: updatedClassifs,
          stories: prev.stories.map(s => s.id === overrideModalStory.id ? { ...s, ai_status: 'overridden' } : s)
        }));

        setOverrideModalStory(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 14 IFPUG GSCs definitions
  const gasNames = [
    { num: 1, name: 'Data Communications', desc: 'Are data/control messages transmitted electronically?' },
    { num: 2, name: 'Distributed Data Processing', desc: 'Are database assets and configurations spread over multiple nodes?' },
    { num: 3, name: 'Performance Constraints', desc: 'Are application response limits, memory metrics strict?' },
    { num: 4, name: 'Heavily Used Configuration', desc: 'Does the application encounter high runtime load or load limits?' },
    { num: 5, name: 'Transaction Rate', desc: 'Is transaction frequency high, affecting memory bounds?' },
    { num: 6, name: 'Online Data Entry', desc: 'What percentage of entry fields are filled interactively?' },
    { num: 7, name: 'End-User Efficiency', desc: 'Does the UX support specific multi-step flow paths easily?' },
    { num: 8, name: 'Online Update', desc: 'Are database writes executed live/interactively?' },
    { num: 9, name: 'Complex Processing', desc: 'Does the system carry strict validation algorithms or encryption?' },
    { num: 10, name: 'Reusability', desc: 'Must the code support standard component reuse requirements?' },
    { num: 11, name: 'Installation Ease', desc: 'Are installation/deployment setups fully automated?' },
    { num: 12, name: 'Operational Ease', desc: 'Are recovery backups, health loops automated?' },
    { num: 13, name: 'Multiple Sites', desc: 'Is the platform distributed over distinct organizations?' },
    { num: 14, name: 'Facilitate Change', desc: 'Does the client customize custom query criteria?' }
  ];

  // Calculations for estimation cards
  const teamSize = currentProject.project?.team_size ?? 5;
  const prodRate = currentProject.costConfig?.fpa_productivity_rate ?? 0.75;
  const workDays = currentProject.costConfig?.working_days_per_month ?? 22;
  const pointCost = currentProject.costConfig?.fpa_cost_per_point ?? 1875;

  const overheadsList = currentProject.overheads || [];
  const ohImpacts = calculateOverheadImpacts(overheadsList, metrics.afp, 0, 0);
  const fpaTotalPoints = Math.round((metrics.afp + ohImpacts.fpaOhPoints) * 100) / 100;

  const fpaBaseCost = fpaTotalPoints * pointCost;
  const fpaEffort = Math.round((fpaTotalPoints / prodRate) * 10) / 10;
  const fpaDuration = teamSize > 0 ? Math.round((fpaEffort / teamSize / workDays) * 10) / 10 : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      
      {/* Estimation Card strip */}
      <div id="fpa-cost-cards-strip" className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-650">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Adjusted Points (AFP)</span>
            <span id="fpa-total-afp" className="text-xl font-extrabold text-slate-800">{fpaTotalPoints.toFixed(1)} pts</span>
            <span className="text-[9px] font-sans text-slate-400 block">Base UFP: {metrics.ufp} × VAF: {metrics.vaf}{ohImpacts.fpaOhPoints > 0 ? ` (+${ohImpacts.fpaOhPoints.toFixed(1)} OH)` : ''}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Estimated Effort</span>
            <span id="fpa-total-effort" className="text-xl font-extrabold text-slate-800">{fpaEffort} days</span>
            <span className="text-[9px] font-sans text-slate-400 block">Productivity: {prodRate} pts/day</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Est Schedule Duration</span>
            <span id="fpa-total-duration" className="text-xl font-extrabold text-slate-800">{fpaDuration} months</span>
            <span className="text-[9px] font-sans text-slate-400 block">Team Pool: {teamSize} resources</span>
          </div>
        </div>
      </div>

      {/* Main Analysis control panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex bg-slate-50 border-b border-slate-200 text-xs">
          <button
            id="fpatab-btn-data"
            onClick={() => setActiveSubTab('data')}
            className={`flex items-center gap-2 px-5 py-3.5 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'data' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Data Functions (ILF / EIF)</span>
            <span className="bg-slate-200 text-slate-650 px-1.5 py-0.2 rounded-full text-[10px]">{dataStories.length}</span>
          </button>

          <button
            id="fpatab-btn-trans"
            onClick={() => setActiveSubTab('transactions')}
            className={`flex items-center gap-2 px-5 py-3.5 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'transactions' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Transactional Functions (EI / EO / EQ)</span>
            <span className="bg-slate-200 text-slate-650 px-1.5 py-0.2 rounded-full text-[10px]">{transactionStories.length}</span>
          </button>

          <button
            id="fpatab-btn-gsc"
            onClick={() => setActiveSubTab('gsc')}
            className={`flex items-center gap-2 px-5 py-3.5 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'gsc' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>Value Adjustment Factors (14 GSCs)</span>
          </button>
        </div>

        <div className="p-4">
          
          {/* Sub-tab A - Data Functions */}
          {activeSubTab === 'data' && (
            <div className="overflow-x-auto w-full">
              {dataStories.length === 0 ? (
                <div className="text-center py-12 text-slate-400 select-none">
                  <Binary className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No Data Logical Functions loaded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Staging story classifications translates ILF and EIF points live.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-slate-650 text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[10px] uppercase text-slate-500">
                      <th className="py-2.5 px-4 w-28">Story Key</th>
                      <th className="py-2.5 px-3">Narrative Description</th>
                      <th className="py-2.5 px-3 w-20">Type</th>
                      <th className="py-2.5 px-3 w-20">RETs</th>
                      <th className="py-2.5 px-3 w-20">DETs</th>
                      <th className="py-2.5 px-3 w-24">Complexity</th>
                      <th className="py-2.5 px-3 w-28 text-center">Est Engine</th>
                      <th className="py-2.5 px-3 w-20 text-center">UFP Pts</th>
                      {!isViewer && <th className="py-2.5 px-4 w-24 text-center">Override</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {dataStories.map(story => {
                      const classif = currentProject.classifications.find(c => c.story_id === story.id && c.model_type === 'fpa');
                      const fpa = classif?.classification as FpaClassification;
                      return (
                        <tr key={story.id}>
                          <td className="py-3 px-4 font-semibold text-slate-900">{story.story_id}</td>
                          <td className="py-3 px-3 italic">"I want to {story.goal}"</td>
                          <td className="py-3 px-3 font-bold text-slate-700">{fpa.functionType}</td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              disabled={isViewer}
                              value={fpa.rets || 1}
                              onChange={(e) => handleParamChange(story.id, 'rets', Number(e.target.value))}
                              className="w-14 border border-slate-200 bg-slate-50 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              disabled={isViewer}
                              value={fpa.dets || 1}
                              onChange={(e) => handleParamChange(story.id, 'dets', Number(e.target.value))}
                              className="w-14 border border-slate-200 bg-slate-50 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fpa.complexity === 'High' 
                                ? 'bg-rose-100 text-rose-800' 
                                : fpa.complexity === 'Average' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {fpa.complexity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {(() => {
                              const provider = classif?.ai_provider || '';
                              let badgeLabel = 'Heuristic';
                              let badgeColors = 'bg-slate-50 text-slate-500 border-slate-200';
                              
                              if (story.ai_status === 'overridden') {
                                badgeLabel = '👤 Override';
                                badgeColors = 'bg-indigo-50 text-indigo-700 border border-indigo-150';
                              } else if (story.ai_status === 'classified' || story.ai_status === 'flagged') {
                                if (provider === 'gemini') {
                                  badgeLabel = '🤖 Gemini AI';
                                  badgeColors = 'bg-emerald-50 text-emerald-700 border border-emerald-150';
                                } else if (provider === 'gemini-fallback') {
                                  badgeLabel = '🤖 AI Fallback';
                                  badgeColors = 'bg-amber-50 text-amber-700 border border-amber-150';
                                } else if (provider === 'local-estimator') {
                                  badgeLabel = '⚙️ Heuristic';
                                  badgeColors = 'bg-slate-50 text-slate-600 border border-slate-200';
                                } else {
                                  badgeLabel = '🤖 AI Predicted';
                                  badgeColors = 'bg-emerald-50 text-emerald-750 border border-emerald-110';
                                }
                              } else {
                                badgeLabel = '⚙️ Heuristic';
                                badgeColors = 'bg-slate-50 text-slate-500 border border-slate-150';
                              }
                              return (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${badgeColors}`}>
                                  {badgeLabel}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900">{fpa.unadjustedFP} pts</td>
                          {!isViewer && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => triggerOverride(story, fpa.complexity)}
                                className="text-indigo-650 hover:text-indigo-800 font-semibold text-[10px] bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                              >
                                Modify
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Sub-tab B - Transactional Functions */}
          {activeSubTab === 'transactions' && (
            <div className="overflow-x-auto w-full">
              {transactionStories.length === 0 ? (
                <div className="text-center py-12 text-slate-400 select-none">
                  <Binary className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No Transactional Interactors loaded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">EI, EO, and EQ functions will render once AI or manuals prioritize structural scopes.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-slate-650 text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[10px] uppercase text-slate-500">
                      <th className="py-2.5 px-4 w-28">Story Key</th>
                      <th className="py-2.5 px-3">Narrative Description</th>
                      <th className="py-2.5 px-3 w-20">Type</th>
                      <th className="py-2.5 px-3 w-20">FTRs</th>
                      <th className="py-2.5 px-3 w-20">DETs</th>
                      <th className="py-2.5 px-3 w-24">Complexity</th>
                      <th className="py-2.5 px-3 w-28 text-center">Est Engine</th>
                      <th className="py-2.5 px-3 w-20 text-center">UFP Pts</th>
                      {!isViewer && <th className="py-2.5 px-4 w-24 text-center">Override</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {transactionStories.map(story => {
                      const classif = currentProject.classifications.find(c => c.story_id === story.id && c.model_type === 'fpa');
                      const fpa = classif?.classification as FpaClassification;
                      return (
                        <tr key={story.id}>
                          <td className="py-3 px-4 font-semibold text-slate-900">{story.story_id}</td>
                          <td className="py-3 px-3 italic">"I want to {story.goal}"</td>
                          <td className="py-3 px-3 font-bold text-slate-700">{fpa.functionType}</td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              disabled={isViewer}
                              value={fpa.ftrs || 0}
                              onChange={(e) => handleParamChange(story.id, 'ftrs', Number(e.target.value))}
                              className="w-14 border border-slate-200 bg-slate-50 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              disabled={isViewer}
                              value={fpa.dets || 1}
                              onChange={(e) => handleParamChange(story.id, 'dets', Number(e.target.value))}
                              className="w-14 border border-slate-200 bg-slate-50 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fpa.complexity === 'High' 
                                ? 'bg-rose-100 text-rose-800' 
                                : fpa.complexity === 'Average' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {fpa.complexity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {(() => {
                              const provider = classif?.ai_provider || '';
                              let badgeLabel = 'Heuristic';
                              let badgeColors = 'bg-slate-50 text-slate-505 border-slate-205';
                              
                              if (story.ai_status === 'overridden') {
                                badgeLabel = '👤 Override';
                                badgeColors = 'bg-indigo-50 text-indigo-700 border border-indigo-150';
                              } else if (story.ai_status === 'classified' || story.ai_status === 'flagged') {
                                if (provider === 'gemini') {
                                  badgeLabel = '🤖 Gemini AI';
                                  badgeColors = 'bg-emerald-50 text-emerald-700 border border-emerald-150';
                                } else if (provider === 'gemini-fallback') {
                                  badgeLabel = '🤖 AI Fallback';
                                  badgeColors = 'bg-amber-50 text-amber-700 border border-amber-150';
                                } else if (provider === 'local-estimator') {
                                  badgeLabel = '⚙️ Heuristic';
                                  badgeColors = 'bg-slate-50 text-slate-600 border border-slate-200';
                                } else {
                                  badgeLabel = '🤖 AI Predicted';
                                  badgeColors = 'bg-emerald-50 text-emerald-750 border border-emerald-110';
                                }
                              } else {
                                badgeLabel = '⚙️ Heuristic';
                                badgeColors = 'bg-slate-50 text-slate-500 border border-slate-150';
                              }
                              return (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${badgeColors}`}>
                                  {badgeLabel}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900">{fpa.unadjustedFP} pts</td>
                          {!isViewer && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => triggerOverride(story, fpa.complexity)}
                                className="text-indigo-650 hover:text-indigo-800 font-semibold text-[10px] bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                              >
                                Modify
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Sub-tab C - 14 GSC adjustment sliders */}
          {activeSubTab === 'gsc' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-250 p-4 rounded-xl flex items-start gap-2.5">
                <Sliders className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-bold text-xs text-slate-700">General System Characteristics (VAF) Adjustment</h4>
                  <p className="font-sans text-[11px] text-slate-400">Rate characteristics on a scale of 0 (no effect) to 5 (strong influence) to determine VAF, bounded strictly within [0.65 - 1.35].</p>
                </div>
                <div className="ml-auto bg-white border border-slate-200 px-3 py-1 text-center rounded">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Calculated TDI</span>
                  <span id="fpa-tdi-display" className="text-sm font-bold text-teal-650">{metrics.tdi}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gasNames.map((gsc) => {
                  const ratingRecord = currentProject.ratings.find(r => r.gsc_number === gsc.num);
                  const activeRating = ratingRecord ? ratingRecord.rating : 0;
                  return (
                    <div key={gsc.num} className="border border-slate-150 p-4 rounded-xl space-y-2 hover:bg-slate-50/50 transition bg-white shadow-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-[10px] text-slate-400 font-bold">{gsc.num}.</span>
                        <div className="flex-1">
                          <h5 className="font-sans font-bold text-xs text-slate-700 leading-none mb-1">{gsc.name}</h5>
                          <p className="text-[10px] font-sans text-slate-450">{gsc.desc}</p>
                        </div>
                        <span id={`gsc-badge-${gsc.num}`} className="font-mono text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{activeRating}</span>
                      </div>
                      <input
                        id={`gsc-slider-${gsc.num}`}
                        type="range"
                        min="0"
                        max="5"
                        disabled={isViewer}
                        value={activeRating}
                        onChange={(e) => saveGscRating(gsc.num, Number(e.target.value))}
                        className="modern-slider"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Override Auditor Modal dialog */}
      {overrideModalStory && (
        <div id="override-modal-bg" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden m-4 border border-slate-200">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center w-full">
              <span className="font-bold text-xs font-mono uppercase text-slate-500">Manual Override FPA: {overrideModalStory.story_id}</span>
              <button onClick={() => setOverrideModalStory(null)} className="text-slate-400 hover:text-slate-650">
                <span>✕</span>
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <p className="text-slate-450 text-[11px] leading-tight">Manually modify the architectural evaluation weights. Overrides require a comprehensive explanation in the audit log.</p>
              
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase block font-bold text-slate-450">Override Complexity Rating</label>
                <select
                  id="override-select-value"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 p-2 text-xs rounded-lg focus:outline-none"
                >
                  <option value="Low">Low Complexity Level</option>
                  <option value="Average">Average Complexity Level</option>
                  <option value="High">High Complexity Level</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase block font-bold text-slate-450">Explanation Reason * (At least 20 chars)</label>
                <textarea
                  id="override-textarea-reason"
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Provide precise details justifying why artificial intelligence predictions differ from realistic parameters..."
                  className="w-full border border-slate-200 bg-slate-50 p-2 text-xs rounded-lg focus:outline-none resize-none"
                />
                <span className={`text-[10px] font-mono block ${overrideReason.length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {overrideReason.length} / 20 characters minimum requirement.
                </span>
              </div>

              <div className="pt-2 text-right">
                <button
                  id="override-submit-btn"
                  onClick={submitOverride}
                  disabled={overrideReason.length < 20}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow cursor-pointer ml-auto"
                >
                  Confirm Override Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
