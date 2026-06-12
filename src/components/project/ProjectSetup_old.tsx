import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Project, CostConfig } from '../../types.js';
import CreateProjectModal from './CreateProjectModal';
import {
  Building2,
  Coins,
  Users2,
  FileEdit,
  HelpCircle,
  Layers2,
  Check,
  ChevronDown,
  ChevronUp,
  ListOrdered,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Loader2,
  Sparkles
} from 'lucide-react';

interface ProjectSetupProps {
  onShowLoadModal: () => void;
}

export default function ProjectSetup({ onShowLoadModal }: ProjectSetupProps) {
  const {
    currentProject,
    saveProject,
    saveCostConfig,
    projects,
    refreshProjects,
    loadProject,
    duplicateProject,
    deleteProject
  } = useProject();
  const { isViewer, isAdmin, profile } = useAuth();

  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [loadedConfigId, setLoadedConfigId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Local project form values
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [projectType, setProjectType] = useState<'Web App' | 'Enterprise-ERP' | 'Mobile App' | 'Embedded-Realtime' | 'Mixed'>('Web App');
  const [status, setStatus] = useState<'Draft' | 'Under Review' | 'Approved'>('Draft');
  const [currency, setCurrency] = useState('SAR');
  const [teamSize, setTeamSize] = useState(5);

  // Cost configuration form values
  const [isCostOpen, setIsCostOpen] = useState(true);
  const [fpaRate, setFpaRate] = useState(1875);
  const [cosmicRate, setCosmicRate] = useState(1875);
  const [hybridRate, setHybridRate] = useState(1875);
  const [blendedRate, setBlendedRate] = useState(1406);
  const [productivity, setProductivity] = useState(1.5);
  const [fpaProductivity, setFpaProductivity] = useState(0.75);
  const [cosmicProductivity, setCosmicProductivity] = useState(1.5);
  const [hybridProductivity, setHybridProductivity] = useState(1.5);
  const [workingDays, setWorkingDays] = useState(22);
  const [useRoles, setUseRoles] = useState(false);
  const [roles, setRoles] = useState<{
    name: string;
    daily_rate: number;
    allocation_percent: number;
    resources_onsite?: number;
    resources_offshore?: number;
    resources_nearshore?: number;
    resources_employee?: number;
  }[]>([]);

  // Derive ratecards when useRoles is checked and roles are configured
  const calculateDerivedRates = () => {
    const totalAlloc = roles.reduce((sum, r) => sum + (r.allocation_percent || 0), 0);
    if (roles.length === 0 || totalAlloc === 0) {
      return { baseBlendedRate: 0, blendedRateWithProfit: 0, fpa: 0, cosmic: 0, hybrid: 0 };
    }

    // Base Blended Daily Rate (squad weighted average cost base number)
    const baseBlendedRate = roles.reduce((sum, r) => {
      return sum + ((r.daily_rate || 0) * (r.allocation_percent || 0)) / 100;
    }, 0);

    // Add 40% profit margin on the base number as requested by user in Issue 11
    const blendedRateWithProfit = baseBlendedRate * 1.40;

    // Ratecard per point = blendedRateWithProfit / productivityRate
    const derivedFpa = fpaProductivity > 0 ? blendedRateWithProfit / fpaProductivity : 0;
    const derivedCosmic = cosmicProductivity > 0 ? blendedRateWithProfit / cosmicProductivity : 0;
    const derivedHybrid = hybridProductivity > 0 ? blendedRateWithProfit / hybridProductivity : 0;

    return {
      baseBlendedRate: Math.round(baseBlendedRate),
      blendedRateWithProfit: Math.round(blendedRateWithProfit),
      fpa: Math.round(derivedFpa),
      cosmic: Math.round(derivedCosmic),
      hybrid: Math.round(derivedHybrid)
    };
  };

  const derived = calculateDerivedRates();

  // Automatically synchronize derived values to Level 1 state input fields
  useEffect(() => {
    if (useRoles && roles.length > 0) {
      const { fpa, cosmic, hybrid } = calculateDerivedRates();
      if (fpa > 0) setFpaRate(fpa);
      if (cosmic > 0) setCosmicRate(cosmic);
      if (hybrid > 0) setHybridRate(hybrid);
    } else if (!useRoles && blendedRate > 0) {
      const derivedFpa = fpaProductivity > 0 ? blendedRate / fpaProductivity : blendedRate;
      const derivedCosmic = cosmicProductivity > 0 ? blendedRate / cosmicProductivity : blendedRate;
      const derivedHybrid = hybridProductivity > 0 ? blendedRate / hybridProductivity : blendedRate;

      setFpaRate(Math.round(derivedFpa));
      setCosmicRate(Math.round(derivedCosmic));
      setHybridRate(Math.round(derivedHybrid));
    }
  }, [useRoles, roles, blendedRate, fpaProductivity, cosmicProductivity, hybridProductivity]);

  const [isSuggestingResources, setIsSuggestingResources] = useState(false);

  const handleGetResourceSuggestions = async () => {
    if (!currentProject.project) return;
    setIsSuggestingResources(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.project.id}/suggest-resources`, {
        method: 'POST'
      });
      if (res.ok) {
        const suggestedRoles = await res.json();
        setRoles(suggestedRoles);
        setUseRoles(true);
        alert('Gemini AI successfully analyzed your available backlog user stories and has formulated a suggested team squad composition!');
      } else {
        const errData = await res.json();
        alert(`Resource suggestion failed: ${errData.error || 'Server error occurred.'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred while contacting the recommendation server: ${err.message}`);
    } finally {
      setIsSuggestingResources(false);
    }
  };

  const [loadingProjectRecordId, setLoadingProjectRecordId] = useState<string | null>(null);

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleOpenProjectDirectly = async (projectId: string) => {
    setLoadingProjectRecordId(projectId);
    try {
      await loadProject(projectId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjectRecordId(null);
    }
  };

  const handleDuplicateDirectly = async (projectId: string, prjName: string) => {
    if (confirm(`Are you sure you want to duplicate the "${prjName}" proposal?`)) {
      try {
        await duplicateProject(projectId);
        await refreshProjects();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteDirectly = async (projectId: string, prjName: string) => {
    if (confirm(`Are you absolutely sure you want to permanently delete "${prjName}"? All user stories, cosmic parameters, and MCDA scores will be deleted.`)) {
      try {
        await deleteProject(projectId);
        await refreshProjects();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateNewInline = () => {
    setShowCreateModal(true);
  };

  useEffect(() => {
    if (!currentProject.project) {
      setLoadedProjectId(null);
      setLoadedConfigId(null);
      return;
    }

    const currentId = currentProject.project.id;
    const configSig = currentProject.costConfig
      ? `${currentProject.costConfig.fpa_cost_per_point}-${currentProject.costConfig.cosmic_cost_per_point}-${currentProject.costConfig.hybrid_cost_per_point}-${currentProject.costConfig.productivity_rate}-${currentProject.costConfig.fpa_productivity_rate}-${currentProject.costConfig.cosmic_productivity_rate}-${currentProject.costConfig.hybrid_productivity_rate}-${currentProject.costConfig.use_role_rates}`
      : 'none';

    if (currentId !== loadedProjectId || configSig !== loadedConfigId) {
      setLoadedProjectId(currentId);
      setLoadedConfigId(configSig);

      setName(currentProject.project.name || '');
      setClient(currentProject.project.client || '');
      setDescription(currentProject.project.description || '');
      setVersion(currentProject.project.version || '1.0');
      setProjectType(currentProject.project.project_type || 'Web App');
      setStatus(currentProject.project.status || 'Draft');
      setCurrency(currentProject.project.currency || 'SAR');
      setTeamSize(currentProject.project.team_size || 5);

      if (currentProject.costConfig) {
        setFpaRate(currentProject.costConfig.fpa_cost_per_point || 1875);
        setCosmicRate(currentProject.costConfig.cosmic_cost_per_point || 1875);
        setHybridRate(currentProject.costConfig.hybrid_cost_per_point || 1875);
        const loadedFpaPd = currentProject.costConfig.fpa_productivity_rate ?? 0.75;
        const defaultBlRate = currentProject.costConfig.blended_rate || Math.round((currentProject.costConfig.fpa_cost_per_point || 1875) * loadedFpaPd);
        setBlendedRate(defaultBlRate);
        setProductivity(currentProject.costConfig.productivity_rate || 1.5);
        setFpaProductivity(currentProject.costConfig.fpa_productivity_rate ?? 0.75);
        setCosmicProductivity(currentProject.costConfig.cosmic_productivity_rate ?? 1.5);
        setHybridProductivity(currentProject.costConfig.hybrid_productivity_rate ?? 1.5);
        setWorkingDays(currentProject.costConfig.working_days_per_month || 22);
        setUseRoles(currentProject.costConfig.use_role_rates || false);
        setRoles(currentProject.costConfig.roles || []);
      }
    }
  }, [currentProject.project, currentProject.costConfig, loadedProjectId, loadedConfigId]);

  const handleProjectSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer || !currentProject.project) return;

    await saveProject({
      name,
      client,
      description,
      version,
      project_type: projectType,
      status,
      currency,
      team_size: Number(teamSize)
    });

    // Save corresponding cost config as well
    await handleCostSave();
  };

  const handleCostSave = async () => {
    if (!currentProject.project || isViewer) return;
    const configPaylold: CostConfig = {
      project_id: currentProject.project.id,
      fpa_cost_per_point: Number(fpaRate),
      cosmic_cost_per_point: Number(cosmicRate),
      hybrid_cost_per_point: Number(hybridRate),
      productivity_rate: Number(productivity),
      fpa_productivity_rate: Number(fpaProductivity),
      cosmic_productivity_rate: Number(cosmicProductivity),
      hybrid_productivity_rate: Number(hybridProductivity),
      working_days_per_month: Number(workingDays),
      use_role_rates: useRoles,
      blended_rate: useRoles ? derived.blendedRateWithProfit : Number(blendedRate),
      roles
    };
    await saveCostConfig(configPaylold);
  };

  const addRoleHandler = () => {
    setRoles([...roles, {
      name: 'New Role',
      daily_rate: 500,
      allocation_percent: 10,
      resources_onsite: 0,
      resources_offshore: 0,
      resources_nearshore: 0,
      resources_employee: 0
    }]);
  };

  const deleteRoleHandler = (index: number) => {
    setRoles(roles.filter((_, idx) => idx !== index));
  };

  const handleRoleChange = (index: number, field: string, value: any) => {
    const updated = [...roles];
    updated[index] = { ...updated[index], [field]: value };
    setRoles(updated);
  };

  const totalAllocation = roles.reduce((sum, r) => sum + Number(r.allocation_percent || 0), 0);
  const isAllocationValid = !useRoles || totalAllocation === 100;

  if (!currentProject.project) {
    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-slate-50 text-center select-none animate-fade-in">
          <Building2 className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="font-sans font-bold text-lg text-slate-700 mb-1">Welcome to Software Estimation Suite</h3>
          <p className="font-sans text-xs text-slate-400 max-w-sm mb-6">Create a fresh project proposal, loaded with customized defaults, or access existing reports dynamically.</p>
          <div className="flex gap-4">
            <button
              id="setup-load-cta-btn"
              onClick={onShowLoadModal}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-transform cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Storage Directory</span>
            </button>
            <button
              id="setup-create-cta-btn"
              onClick={handleCreateNewInline}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Proposal</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <h2 className="font-sans font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-teal-600" />
              <span>Active Project Proposals</span>
            </h2>
            <p className="font-sans text-xs text-slate-400 mt-1">Browse, estimate, duplicate, or inspect existing software scopes in your archive database.</p>
          </div>
          <button
            onClick={handleCreateNewInline}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow transition cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Proposal</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-slate-900 group-hover:text-teal-600 transition text-sm leading-snug line-clamp-2">
                    {proj.name}
                  </h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${proj.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : proj.status === 'Under Review'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                    {proj.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{proj.client || 'General / Internal'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                      {proj.project_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Version:</span>
                    <span className="font-mono text-slate-650">{proj.version || '1.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimator:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[120px]">{proj.estimator_name || 'Umesh Sharma'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Updated:</span>
                    <span className="text-slate-500 text-[11px]">{new Date(proj.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4 flex gap-2">
                <button
                  onClick={() => handleOpenProjectDirectly(proj.id)}
                  disabled={loadingProjectRecordId === proj.id}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                >
                  {loadingProjectRecordId === proj.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5" />
                  )}
                  <span>Open Workspace</span>
                </button>

                <button
                  onClick={() => handleDuplicateDirectly(proj.id, proj.name)}
                  title="Duplicate Proposal"
                  className="p-2 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 rounded-lg transition bg-white cursor-pointer hover:bg-slate-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDirectly(proj.id, proj.name)}
                    title="Delete Proposal"
                    className="p-2 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg transition bg-white cursor-pointer hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-sans font-extrabold text-lg text-slate-800 tracking-tight">Project Coordinates</h2>
          <p className="font-sans text-xs text-slate-400">Initialize core parameters, currencies, team constraints, and estimator settings.</p>
        </div>
        <button
          onClick={onShowLoadModal}
          className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold text-xs"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Change Project</span>
        </button>
      </div>

      <form onSubmit={handleProjectSave} className="space-y-6">
        {/* Core fields grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5ColSpan md:col-span-2">
            <label id="lbl-proj-name" className="text-[10px] font-mono font-bold uppercase text-slate-500">Project Proposal Name *</label>
            <input
              id="setup-input-name"
              type="text"
              required
              disabled={isViewer}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Finance Cloud Migration"
              className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2 px-3 rounded-lg focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Client / Institution</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="setup-input-client"
                type="text"
                disabled={isViewer}
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Google Cloud Labs"
                className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2 pl-9 pr-3 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Currency Settings</label>
            <div className="relative">
              <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                id="setup-select-currency"
                disabled={isViewer}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2.5 pl-9 pr-3 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="USD">USD ($) Standard Dollars</option>
                <option value="EUR">EUR (€) Euro Standard</option>
                <option value="GBP">GBP (£) British Pound</option>
                <option value="SAR">SAR (ر.س) Saudi Riyal</option>
                <option value="AED">AED (د.إ) Emirati Dirham</option>
                <option value="INR">INR (₹) Indian Rupee</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Engineering Category *</label>
            <select
              id="setup-select-type"
              disabled={isViewer}
              value={projectType}
              onChange={(e: any) => setProjectType(e.target.value)}
              className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2.5 px-3 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="Web App">Web Application Portfolio</option>
              <option value="Enterprise-ERP">Enterprise Software (ERP/CRM)</option>
              <option value="Mobile App">Mobile Native Application</option>
              <option value="Embedded-Realtime">Embedded and Real-time Engines</option>
              <option value="Mixed">Mixed Architecture Platform</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Assigned Team PoolSize *</label>
            <div className="relative">
              <Users2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="setup-input-teamsize"
                type="number"
                min="1"
                disabled={isViewer}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2 pl-9 pr-3 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Revision Identifier</label>
            <input
              id="setup-input-version"
              type="text"
              disabled={isViewer}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 1.0"
              className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2 px-3 rounded-lg focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">proposal Status</label>
            <select
              id="setup-select-status"
              disabled={isViewer}
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2.5 px-3 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="Draft">Draft Workspace</option>
              <option value="Under Review">Under Board Review</option>
              <option value="Approved">Approved Status</option>
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Proposal Scope / Description</label>
            <textarea
              id="setup-textarea-desc"
              disabled={isViewer}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive breakdown of architectural requirements, system boundaries, scope limits, and user profiles."
              rows={3}
              className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 focus:border-teal-500 font-sans text-xs py-2 px-3 rounded-lg focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 text-right p-1 bg-slate-50 border border-slate-100 rounded">
            <span className="text-[10px] font-sans text-slate-400">
              Assigned Estimator Agent: <strong className="text-slate-600">{currentProject.project.estimator_name || profile?.full_name}</strong> ({profile?.organisation})
            </span>
          </div>
        </div>

        {/* Cost Config Collapsible Sub panel (PART B Cost Config) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <button
            type="button"
            id="setup-btn-toggle-cost"
            onClick={() => setIsCostOpen(!isCostOpen)}
            className="w-full bg-slate-50/80 hover:bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200 transition text-left"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-sans font-extrabold text-sm text-slate-700 tracking-tight">Financial & Cost Rates Matrix</h3>
                <p className="font-sans text-[11px] text-slate-400 leading-none">Configure cost-per-point allocations, productivity, and resource roles.</p>
              </div>
            </div>
            {isCostOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {isCostOpen && (
            <div className="p-6 space-y-6">
              {/* Level 1: Model Cost Point Selection */}
              <div>
                <h4 className="font-sans font-bold text-xs text-slate-700 mb-3 border-l-2 border-teal-600 pl-2">Level 1 — Function Point Pricing Models</h4>

                {/* Blended Daily Rate Input Card */}
                {!useRoles ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-teal-600" />
                        Blended Daily Rate ({currency}) — Manual Entry
                      </label>
                      <input
                        id="cost-blended-rate-manual"
                        type="number"
                        disabled={isViewer}
                        value={blendedRate}
                        onChange={(e) => setBlendedRate(Number(e.target.value))}
                        className="w-full border border-slate-200 bg-white font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Enter Blended Rate"
                      />
                      <p className="text-[9px] text-slate-400 italic">
                        Populates cost per point for FPA, COSMIC, and Hybrid using formula: <span className="font-semibold font-mono">Blended Rate / Productivity</span>.
                      </p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-lg p-3 text-slate-500 text-xs flex flex-col justify-center">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px] mb-1">
                        <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        Fallback Mode Active (Role-Based Pricing Off)
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Your entered Blended Daily Rate is automatically divided by each model's Level 2 Productivity rate to compute/populate its corresponding cost per point below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-indigo-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        Blended Daily Rate ({currency}) — Role-Based Derived
                      </label>
                      <input
                        id="cost-blended-rate-derived"
                        type="number"
                        disabled={true}
                        value={derived.blendedRateWithProfit}
                        className="w-full border border-indigo-150 bg-indigo-50/70 font-sans font-semibold text-indigo-800 text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                      />
                      <p className="text-[9px] text-indigo-700 italic">
                        Calculated automatically using Level 3 Roles Squad + 40% profit margin as the baseline.
                      </p>
                    </div>
                    <div className="bg-white border border-indigo-100 rounded-lg p-3 text-slate-650 text-xs flex flex-col justify-center">
                      <div className="font-semibold text-indigo-800 flex items-center gap-1.5 text-[11px] mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        Role-Based Pricing Active (Level 3 Connected)
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal">
                        Model cost per point rates are derived from the configured daily rates and allocations of your roles below.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">FPA Cost Per Point ({currency})</label>
                    <input
                      id="cost-fpa-rate"
                      type="number"
                      disabled={isViewer}
                      value={fpaRate}
                      onChange={(e) => setFpaRate(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">COSMIC Cost Per Point ({currency})</label>
                    <input
                      id="cost-cosmic-rate"
                      type="number"
                      disabled={isViewer}
                      value={cosmicRate}
                      onChange={(e) => setCosmicRate(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">Hybrid Cost Per Point ({currency})</label>
                    <input
                      id="cost-hybrid-rate"
                      type="number"
                      disabled={isViewer}
                      value={hybridRate}
                      onChange={(e) => setHybridRate(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                {useRoles && roles.length > 0 && (
                  <div className="mt-3.5 bg-indigo-50/50 border border-indigo-150 rounded-xl p-3.5 text-[11px] text-indigo-850 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900 border-b border-indigo-100 pb-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-650" />
                      <span>Level 1 Rates Automatically Derived from Level 3 Role Rates</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-2.5 rounded-lg border border-indigo-100/50 font-mono text-[10px]">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">Base Blended Daily Rate (Squad Cost)</span>
                        <span className="text-slate-800 font-extrabold">{derived.baseBlendedRate} {currency}/day</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">Sovereign Blended Rate (+40% Profit)</span>
                        <span className="text-indigo-700 font-extrabold">{derived.blendedRateWithProfit} {currency}/day</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block uppercase font-bold text-[9px] mb-0.5">Formula: Rate per Pt = (Blended Rate with 40% Margin) / (Productivity Rate)</span>
                        <ul className="space-y-0.5 text-indigo-900 list-disc list-inside">
                          <li>FPA Point: <span className="font-bold">{derived.blendedRateWithProfit} / {fpaProductivity || 0.75} = {derived.fpa} {currency}</span></li>
                          <li>COSMIC/Hybrid Point: <span className="font-bold">{derived.blendedRateWithProfit} / {cosmicProductivity || 1.5} = {derived.cosmic} {currency}</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Level 2: Productivity Rates */}
              <div>
                <h4 className="font-sans font-bold text-xs text-slate-700 mb-3 border-l-2 border-teal-600 pl-2">Level 2 — Baseline Productivity Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">FPA (points / day)</label>
                    <input
                      id="cost-productivity-fpa"
                      type="number"
                      step="0.1"
                      disabled={isViewer}
                      value={fpaProductivity}
                      onChange={(e) => setFpaProductivity(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">COSMIC (points / day)</label>
                    <input
                      id="cost-productivity-cosmic"
                      type="number"
                      step="0.1"
                      disabled={isViewer}
                      value={cosmicProductivity}
                      onChange={(e) => setCosmicProductivity(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">MCDA Hybrid (points / day)</label>
                    <input
                      id="cost-productivity-hybrid"
                      type="number"
                      step="0.1"
                      disabled={isViewer}
                      value={hybridProductivity}
                      onChange={(e) => setHybridProductivity(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-400">Working Days Per Month</label>
                    <input
                      id="cost-working-days"
                      type="number"
                      disabled={isViewer}
                      value={workingDays}
                      onChange={(e) => setWorkingDays(Number(e.target.value))}
                      className="w-full border border-slate-200 bg-slate-50 font-sans text-xs py-1.5 px-3 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Level 3: Role-Based toggle */}
              <div>
                <div className="flex items-center justify-between mb-3 border-l-2 border-teal-600 pl-2 flex-wrap gap-2">
                  <h4 className="font-sans font-bold text-xs text-slate-700">Level 3 — Role-Based Resource Pricing</h4>
                  <div className="flex items-center gap-4">
                    {!isViewer && (
                      <button
                        type="button"
                        id="btn-ai-suggest-resources"
                        disabled={isSuggestingResources || isViewer}
                        onClick={handleGetResourceSuggestions}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-750 border border-purple-200 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shadow-xs cursor-pointer select-none"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                        <span>{isSuggestingResources ? "Formulating squad..." : "AI Suggest Resources"}</span>
                      </button>
                    )}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="use-role-rates-toggle"
                        disabled={isViewer}
                        checked={useRoles}
                        onChange={(e) => setUseRoles(e.target.checked)}
                        className="mr-2 cursor-pointer rounded"
                      />
                      <label htmlFor="use-role-rates-toggle" className="text-xs text-slate-500 cursor-pointer select-none">Use Role rates</label>
                    </div>
                  </div>
                </div>

                {useRoles && (
                  <div className="space-y-3 animate-fade-in border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-slate-450 uppercase">Configure allocations (Sum must equal 100%)</span>
                      {!isViewer && (
                        <button
                          type="button"
                          id="cost-btn-add-role"
                          onClick={addRoleHandler}
                          className="flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded px-2 py-1 text-[10px] font-semibold transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Role</span>
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-600 min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-left">
                            <th className="py-2.5 pl-1 font-semibold text-slate-700">Role Name</th>
                            <th className="py-2.5 font-semibold text-slate-700">Daily Rate ({currency})</th>
                            <th className="py-2.5 font-semibold text-slate-700">Allocation (%)</th>
                            <th className="py-2.5 font-semibold text-slate-700">Onsite Qty</th>
                            <th className="py-2.5 font-semibold text-slate-700">Offshore Qty</th>
                            <th className="py-2.5 font-semibold text-slate-700">Nearshore Qty</th>
                            <th className="py-2.5 font-semibold text-slate-700">Employees Qty</th>
                            {!isViewer && <th className="py-2.5 w-10 text-center font-semibold text-slate-700">Delete</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roles.map((role, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 pr-2">
                                <input
                                  type="text"
                                  value={role.name}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'name', e.target.value)}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-full focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  value={role.daily_rate}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'daily_rate', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-24 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  value={role.allocation_percent}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'allocation_percent', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-20 focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold"
                                />
                              </td>
                              {/* New location counts */}
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={role.resources_onsite ?? 0}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'resources_onsite', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-16 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={role.resources_offshore ?? 0}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'resources_offshore', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-16 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={role.resources_nearshore ?? 0}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'resources_nearshore', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-16 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={role.resources_employee ?? 0}
                                  disabled={isViewer}
                                  onChange={(e) => handleRoleChange(idx, 'resources_employee', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs w-16 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                                />
                              </td>
                              {!isViewer && (
                                <td className="py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => deleteRoleHandler(idx)}
                                    className="text-slate-400 hover:text-rose-650 p-1.5 rounded hover:bg-slate-100 transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-xs text-slate-400">Total Allocation Weight Check:</span>
                      <span
                        id="role-sum-alloc"
                        className={`text-xs font-bold ${isAllocationValid ? 'text-emerald-600' : 'text-rose-500 animate-pulse'}`}
                      >
                        {totalAllocation}% {isAllocationValid ? '— Validated ✓' : '— Invalid, must equal 100%'}
                      </span>
                    </div>

                    {/* Visual summaries of the resource loading to clarify allocations and locations */}
                    <div className="mt-4 bg-teal-50/50 border border-teal-150 rounded-xl p-4 space-y-3.5">
                      <div className="flex items-center gap-1 text-xs font-bold text-teal-900 border-b border-teal-100 pb-1.5 uppercase tracking-wide">
                        <Users2 className="w-4 h-4 text-teal-650" />
                        <span>Resource Headcount & Sourcing Summary</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[11px]">
                        <div className="bg-white border border-teal-100 p-2.5 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block uppercase font-bold text-[9px] mb-0.5">Onsite Qty</span>
                          <span className="text-slate-800 font-extrabold text-xs">
                            {roles.reduce((sum, r) => sum + (r.resources_onsite || 0), 0)} FTEs
                          </span>
                        </div>
                        <div className="bg-white border border-teal-100 p-2.5 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block uppercase font-bold text-[9px] mb-0.5">Offshore/Nearshore</span>
                          <span className="text-slate-800 font-extrabold text-xs">
                            {roles.reduce((sum, r) => sum + (r.resources_offshore || 0) + (r.resources_nearshore || 0), 0)} FTEs
                          </span>
                        </div>
                        <div className="bg-white border border-teal-100 p-2.5 rounded-lg shadow-2xs bg-indigo-50/20">
                          <span className="text-indigo-600 block uppercase font-bold text-[9px] mb-0.5">Total Squad Headcount</span>
                          <span className="text-indigo-850 font-extrabold text-xs">
                            {roles.reduce((sum, r) => sum + (r.resources_onsite || 0) + (r.resources_offshore || 0) + (r.resources_nearshore || 0), 0)} FTEs
                          </span>
                        </div>
                        <div className="bg-white border border-teal-100 p-2.5 rounded-lg shadow-2xs">
                          <span className="text-slate-400 block uppercase font-bold text-[9px] mb-0.5">Internal Employees</span>
                          <span className="text-slate-800 font-extrabold text-xs">
                            {roles.reduce((sum, r) => sum + (r.resources_employee || 0), 0)} FTEs
                          </span>
                          <span className="text-[8px] text-slate-400 block leading-tight mt-0.5">
                            ({roles.reduce((sum, r) => {
                              const totalGeo = (r.resources_onsite || 0) + (r.resources_offshore || 0) + (r.resources_nearshore || 0);
                              return sum + Math.max(0, totalGeo - (r.resources_employee || 0));
                            }, 0)} Contractors)
                          </span>
                        </div>
                      </div>

                      {/* Explicitly explain the logic to completely eliminate conceptual confusion */}
                      <div className="bg-white p-2.5 border border-teal-100 rounded-lg text-[10px] text-slate-500 leading-relaxed space-y-1">
                        <span className="text-teal-850 font-bold uppercase block text-[8px] tracking-wider mb-0.5">★ Architectural Loading Rule</span>
                        <p>
                          Your total headcount is determined solely by the location buckets (<strong className="text-slate-700">Onsite + Offshore + Nearshore</strong>).
                          The <strong className="text-slate-700">Employees Qty</strong> field designates the sourcing type of those resources (i.e., of the total allocated, how many are direct company employees vs. external contractors). It does <span className="font-bold text-rose-600">not</span> add additional count or duplicate your team size.
                        </p>
                        {roles.some(r => {
                          const totalGeo = (r.resources_onsite || 0) + (r.resources_offshore || 0) + (r.resources_nearshore || 0);
                          return (r.resources_employee || 0) > totalGeo;
                        }) && (
                            <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-100 text-rose-750 font-bold rounded flex items-center gap-1 text-[9px]">
                              <span>⚠️ Sourcing warning: Employee quantity exceeds geographical allocation on one or more roles.</span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit operations */}
        {!isViewer && (
          <div className="text-right">
            <button
              id="setup-save-btn"
              type="submit"
              disabled={!isAllocationValid}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-350 text-white font-semibold text-xs py-2 px-6 rounded-lg shadow-md transition ml-auto cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Submit Settings</span>
            </button>
          </div>
        )}
      </form>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
