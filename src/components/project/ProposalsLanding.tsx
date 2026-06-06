import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Project } from '../../types';
import { 
  FolderGit2, 
  PlusCircle, 
  Edit3, 
  Copy, 
  Trash2, 
  Sparkles, 
  Binary, 
  Orbit, 
  Layers, 
  ArrowRight, 
  Calendar, 
  User, 
  Briefcase, 
  DollarSign, 
  Users, 
  Settings, 
  Check, 
  X,
  FileSpreadsheet,
  Workflow,
  Loader2
} from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';

interface ProposalsLandingProps {
  onSelectTab: (tab: 'proposals' | 'setup' | 'stories' | 'fpa' | 'cosmic' | 'hybrid' | 'calibration' | 'dashboard' | 'settings') => void;
  onOpenCreateModal: () => void;
}

export default function ProposalsLanding({ onSelectTab, onOpenCreateModal }: ProposalsLandingProps) {
  const { 
    projects, 
    isLoadingProjects,
    refreshProjects, 
    loadProject, 
    duplicateProject, 
    deleteProject,
    currentProject,
    saveProject
  } = useProject();
  
  const { isAdmin, isViewer } = useAuth();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  // Edit fields state
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editCurrency, setEditCurrency] = useState('SAR');
  const [editTeamSize, setEditTeamSize] = useState(5);
  const [editType, setEditType] = useState('Web App');
  const [editStatus, setEditStatus] = useState('Draft');

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleOpenProject = async (id: string, tab: 'proposals' | 'setup' | 'stories' | 'fpa' | 'cosmic' | 'hybrid' | 'calibration' | 'dashboard' | 'settings' = 'stories') => {
    try {
      setLoadingProjectId(id);
      await loadProject(id);
      onSelectTab(tab);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleStartEditing = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditName(proj.name || '');
    setEditClient(proj.client || 'General Client');
    setEditVersion(proj.version || '1.0');
    setEditCurrency(proj.currency || 'SAR');
    setEditTeamSize(proj.team_size || 5);
    setEditType(proj.project_type || 'Web App');
    setEditStatus(proj.status || 'Draft');
  };

  const handleSaveInlineEdit = async (projId: string) => {
    if (!editName.trim()) return;
    
    // If the edited project is currently active, we can save via the saveProject action or direct API.
    // To be absolutely robust, let's call the API to save, then refresh.
    try {
      const isCurrent = currentProject.project?.id === projId;
      const payload = {
        name: editName,
        client: editClient,
        version: editVersion,
        currency: editCurrency,
        team_size: Number(editTeamSize) || 5,
        project_type: editType as any,
        status: editStatus as any
      };

      const res = await fetch(`/api/projects/${projId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (isCurrent) {
          // reload current project state
          await loadProject(projId);
        }
        await refreshProjects();
        setEditingProjectId(null);
      }
    } catch (e) {
      console.error('Failed to save parameters', e);
    }
  };

  const handleDeleteProj = async (proj: Project) => {
    if (confirm(`Are you absolutely sure you want to permanently delete "${proj.name}"? This will erase all its associated stories and calculations. This process is irreversible.`)) {
      await deleteProject(proj.id);
    }
  };

  const handleDuplicateProj = async (proj: Project) => {
    await duplicateProject(proj.id);
  };

  // Aggregated Stats for Banner
  const totalCount = projects.length;
  const approvedCount = projects.filter(p => p.status === 'Approved').length;
  const underReviewCount = projects.filter(p => p.status === 'Under Review').length;
  const avgStories = totalCount > 0 
    ? Math.round(projects.reduce((acc, p) => acc + (p.story_count || 0), 0) / totalCount * 10) / 10 
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 font-sans">
      
      {/* Header Canvas banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] rounded uppercase tracking-wider">
              Central Hub
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">Multi-Model Unified Metrics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Estimation Cockpit & Proposals List
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            See size point summaries across FPA, COSMIC, and Hybrid models simultaneously. Adjust critical meta parameters of any proposal instantly, or duplicate reference configurations to standardise your software estimation accuracy.
          </p>
        </div>

        {!isViewer && (
          <button
            onClick={onOpenCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-lg shadow-sm transition flex items-center gap-2 self-start md:self-center cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Estimate Proposal</span>
          </button>
        )}
      </div>

      {/* Aggregate metrics dashboards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Total Proposals</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{totalCount}</span>
            <span className="text-[10px] text-slate-400 font-sans font-medium">registered</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Approved Contracts</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-green-600">{approvedCount}</span>
            <span className="text-[10px] text-slate-400 font-sans font-medium">estimation ready</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Under Review</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-500">{underReviewCount}</span>
            <span className="text-[10px] text-slate-400 font-sans font-medium">pipeline</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Avg Stories Count</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-650">{avgStories}</span>
            <span className="text-[10px] text-slate-400 font-sans font-medium">per backlog</span>
          </div>
        </div>
      </div>

      {/* Active Proposal Quick Actions */}
      {currentProject.project && (
        <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 block uppercase tracking-wider">Currently Loaded Working Proposal</span>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span>{currentProject.project.name}</span>
                <span className="text-slate-350">•</span>
                <span className="text-slate-550 font-medium">{currentProject.project.client || 'General Client'}</span>
                <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                  {currentProject.project.version}
                </span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => onSelectTab('stories')}
              className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-xs py-1.5 px-4 rounded-lg transition flex items-center gap-1.5 shadow-3xs cursor-pointer"
            >
              <span>Manage Backlog Stories ({currentProject.stories.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectTab('dashboard')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>View Unified Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Proposal Directory Card List */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mt-4">Registered Estimates Directory</h2>
      {isLoadingProjects ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">Synchronizing Estimates & Proposal Files...</h3>
          <p className="text-xs text-slate-400 mt-1">Please wait while the unified multi-model decision database is loaded.</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No proposal indexes found</h3>
          <p className="text-xs text-slate-400 mt-1">Get started by creating your initial project proposal parameters.</p>
          {!isViewer && (
            <button
              onClick={onOpenCreateModal}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-sm transition"
            >
              Create first proposal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {projects.map((proj) => {
            const isEditing = editingProjectId === proj.id;
            const isActive = currentProject.project?.id === proj.id;
            const isLoadingThis = loadingProjectId === proj.id;

            return (
              <div 
                key={proj.id} 
                className={`bg-white border rounded-2xl shadow-3xs overflow-hidden transition-all duration-200 ${
                  isActive 
                    ? 'border-indigo-400 ring-2 ring-indigo-50/50' 
                    : 'border-slate-200 hover:border-slate-350 hover:shadow-sm'
                }`}
              >
                {/* Proposal Header Banner: Name and basic parameters */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/40">
                  {isEditing ? (
                    // INLINE EDIT MODE
                    <div className="space-y-4 animate-fade-in text-xs font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Proposal Name</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Client Name</label>
                          <input
                            type="text"
                            value={editClient}
                            onChange={(e) => setEditClient(e.target.value)}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Version Indicator</label>
                          <input
                            type="text"
                            value={editVersion}
                            onChange={(e) => setEditVersion(e.target.value)}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Currency Code</label>
                          <select
                            value={editCurrency}
                            onChange={(e) => setEditCurrency(e.target.value)}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                          >
                            <option value="SAR">SAR (Saudi Riyal)</option>
                            <option value="USD">USD (US Dollar)</option>
                            <option value="EUR">EUR (Euro)</option>
                            <option value="AED">AED (UAE Dirham)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Engineers Capacity</label>
                          <input
                            type="number"
                            min="1"
                            value={editTeamSize}
                            onChange={(e) => setEditTeamSize(Number(e.target.value))}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Engineering Platform</label>
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                          >
                            <option value="Web App">Web application (Cloud)</option>
                            <option value="Mobile App">Mobile application (Native)</option>
                            <option value="Enterprise-ERP">Enterprise / ERP Core</option>
                            <option value="Embedded-Realtime">Embedded / IoT Realtime</option>
                            <option value="Mixed">Mixed platform / Hybrid core</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">Proposal Stage</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full bg-white border border-slate-250 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                          >
                            <option value="Draft">Draft Mode</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Approved">Approved / Estimate Locked</option>
                          </select>
                        </div>
                      </div>

                      {/* Editing actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setEditingProjectId(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveInlineEdit(proj.id)}
                          className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // RENDER MODE
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-sm">{proj.name}</h3>
                          
                          {/* Active Label */}
                          {isActive && (
                            <span className="bg-indigo-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              Loaded
                            </span>
                          )}

                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            proj.status === 'Approved' 
                              ? 'bg-green-100 text-green-800' 
                              : proj.status === 'Under Review' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {proj.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>Client: <strong className="text-slate-800">{proj.client || 'General'}</strong></span>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1">
                            <Workflow className="w-3.5 h-3.5 text-slate-400" />
                            <span>Type: {proj.project_type || 'Web App'}</span>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <span>V-Code: {proj.version || '1.0'}</span>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Updated: {new Date(proj.updated_at).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 self-end md:self-center">
                        <button
                          onClick={() => handleStartEditing(proj)}
                          disabled={isViewer}
                          title="Modify Project Parameters"
                          className="text-slate-500 hover:text-slate-850 border border-slate-200 hover:border-slate-350 p-2 rounded-lg transition bg-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">Parameters</span>
                        </button>

                        <button
                          onClick={() => handleDuplicateProj(proj)}
                          disabled={isViewer}
                          title="Duplicate Reference Proposal"
                          className="text-slate-500 hover:text-slate-850 border border-slate-200 hover:border-slate-350 p-2 rounded-lg transition bg-white cursor-pointer disabled:opacity-50"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteProj(proj)}
                            title="Delete Proposal File"
                            className="text-slate-400 hover:text-rose-650 border border-slate-200 hover:border-rose-150 p-2 rounded-lg transition bg-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="w-px h-6 bg-slate-200 mx-1.5" />

                        <button
                          onClick={() => handleOpenProject(proj.id)}
                          disabled={isLoadingThis}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open Scope</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimation sizing dashboards for each model */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white">
                  
                  {/* Left segment stats */}
                  <div className="space-y-2 border-r border-slate-100 pr-4 flex flex-col justify-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Backlog Profile</span>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-800">
                        <span>User Stories:</span>
                        <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-black">{proj.story_count ?? 0}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-slate-800">
                        <span>Staff size:</span>
                        <strong className="font-mono text-slate-900 font-bold">{proj.team_size ?? 5} engineers</strong>
                      </div>
                      <div className="flex justify-between text-xs text-slate-800">
                        <span>Fiat Currency:</span>
                        <strong className="font-mono text-indigo-700 font-extrabold">{proj.currency || 'SAR'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* FPA model output */}
                  <div className="bg-slate-50/50 border border-slate-150/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Binary className="w-4 h-4 text-indigo-600" />
                        <span className="font-extrabold text-[11px] text-slate-750 uppercase tracking-tight">FPA Model (Adjusted)</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 rounded uppercase">AFP</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">Base size</span>
                        <span className="text-[9px] font-mono text-indigo-400 font-bold">Unadjusted</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 font-mono tracking-tight mb-1">
                        {proj.fpa_points !== undefined ? `${proj.fpa_points.toFixed(1)}` : '0.0'}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">AFP</span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-slate-100 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">Incl. Overheads</span>
                        <span className="text-[9px] font-mono text-indigo-700 font-extrabold uppercase">Gross</span>
                      </div>
                      <div className="text-lg font-black text-slate-850 font-mono tracking-tight">
                        {proj.fpa_points_with_overheads !== undefined ? `${proj.fpa_points_with_overheads.toFixed(1)}` : '0.0'}{' '}
                        <span className="text-xs text-slate-500 font-bold font-sans">AFP</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenProject(proj.id, 'fpa')}
                      className="text-[10px] font-bold text-indigo-650 hover:text-indigo-800 flex items-center gap-0.5 justify-end"
                    >
                      <span>Analyze GSC matrix</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* COSMIC model output */}
                  <div className="bg-slate-50/50 border border-slate-150/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Orbit className="w-4 h-4 text-teal-600" />
                        <span className="font-extrabold text-[11px] text-slate-750 uppercase tracking-tight">COSMIC ISO-19761</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-teal-50 text-teal-700 px-1.5 rounded uppercase">CFP</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">Base movements</span>
                        <span className="text-[9px] font-mono text-teal-400 font-bold">Unadjusted</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 font-mono tracking-tight mb-1">
                        {proj.cosmic_points !== undefined ? `${proj.cosmic_points.toFixed(0)}` : '0'}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">CFP</span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-slate-100 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">Incl. Overheads</span>
                        <span className="text-[9px] font-mono text-teal-700 font-extrabold uppercase">Gross</span>
                      </div>
                      <div className="text-lg font-black text-slate-850 font-mono tracking-tight">
                        {proj.cosmic_points_with_overheads !== undefined ? `${proj.cosmic_points_with_overheads.toFixed(1)}` : '0.0'}{' '}
                        <span className="text-xs text-slate-500 font-bold font-sans">CFP</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenProject(proj.id, 'cosmic')}
                      className="text-[10px] font-bold text-teal-600 hover:text-teal-850 flex items-center gap-0.5 justify-end"
                    >
                      <span>Analyze movements</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Hybrid MDCAM model output */}
                  <div className="bg-slate-50/50 border border-slate-150/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-violet-600" />
                        <span className="font-extrabold text-[11px] text-slate-750 uppercase tracking-tight">Hybrid Score (MCDA)</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-violet-50 text-violet-700 px-1.5 rounded uppercase">HFP</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">Base criteria score</span>
                        <span className="text-[9px] font-mono text-violet-400 font-bold">Unadjusted</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 font-mono tracking-tight mb-1">
                        {proj.hybrid_points !== undefined ? `${proj.hybrid_points.toFixed(0)}` : '0'}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">HFP</span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-slate-100 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">Incl. Overheads</span>
                        <span className="text-[9px] font-mono text-violet-700 font-extrabold uppercase">Gross</span>
                      </div>
                      <div className="text-lg font-black text-slate-850 font-mono tracking-tight">
                        {proj.hybrid_points_with_overheads !== undefined ? `${proj.hybrid_points_with_overheads.toFixed(1)}` : '0.0'}{' '}
                        <span className="text-xs text-slate-500 font-bold font-sans">HFP</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleOpenProject(proj.id, 'hybrid')}
                      className="text-[10px] font-bold text-violet-700 hover:text-violet-850 flex items-center gap-0.5 justify-end"
                    >
                      <span>Analyze MCDA rules</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Helper guide segment */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 font-sans">
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-slate-550" />
          <span>Decision Support Sizing Frameworks Reference Guide</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-650 leading-relaxed">
          <div className="space-y-1 bg-white p-3.5 rounded-lg border border-slate-150 shadow-3xs">
            <h5 className="font-bold text-slate-900 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              <span>Function Points (IFPUG FPA)</span>
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              Standard transactional sizing analyzing Inputs, Outputs, Queries, and Data Stores. Optimized for corporate database applications and legacy system evaluations.
            </p>
          </div>
          <div className="space-y-1 bg-white p-3.5 rounded-lg border border-slate-150 shadow-3xs">
            <h5 className="font-bold text-slate-900 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
              <span>COSMIC Sizing (ISO/IEC 19761)</span>
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              Measures explicit data movements: Entry, Exit, Read, and Write. Highly suited for real-time systems, cloud-native API hubs, and microservices architecture.
            </p>
          </div>
          <div className="space-y-1 bg-white p-3.5 rounded-lg border border-slate-150 shadow-3xs">
            <h5 className="font-bold text-slate-900 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              <span>Hybrid Weighted MCDA Sizing</span>
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              A bespoke multi-dimensional framework scoring UI complexity, logic rules, data volume, and integrations. Calibrated using standard Fibonacci indices.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
