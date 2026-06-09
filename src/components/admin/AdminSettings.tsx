import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ShieldAlert,
  HelpCircle,
  Settings,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  Activity,
  CheckCircle,
  Database,
  Cpu,
  History,
  Percent
} from 'lucide-react';

export default function AdminSettings() {
  const { currentProject, setProjectScope, refreshProjects } = useProject();
  const { isViewer } = useAuth();

  // Settings states
  const [primaryAiProvider, setPrimaryAiProvider] = useState('gemini');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [groqKey, setGroqKey] = useState('');
  const [cfWorkersUrl, setCfWorkersUrl] = useState('');

  // Overheads States
  const [ohPm, setOhPm] = useState(10);
  const [ohBa, setOhBa] = useState(15);
  const [ohUx, setOhUx] = useState(8);
  const [ohQa, setOhQa] = useState(15);
  const [ohSecurity, setOhSecurity] = useState(5);
  const [ohUat, setOhUat] = useState(10);
  const [ohDeployment, setOhDeployment] = useState(5);
  const [ohRisk, setOhRisk] = useState(10);

  // Audits and Simulations states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSimMismatch, setShowSimMismatch] = useState(false);

  // Supabase Database Integration states
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseLogs, setSupabaseLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
    loadAudits();
    fetchSupabaseStatus();
  }, [currentProject.project]);

  const fetchSupabaseStatus = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch('/api/admin/supabase-status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error('Failed to get Supabase status:', err);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleSupabaseSync = async () => {
    if (!window.confirm('This will seed/upsert all current project estimators, user stories, classifications, overheads, and configurations to Supabase Postgres. Proceed?')) {
      return;
    }
    setIsSyncingSupabase(true);
    setSupabaseLogs(['Initiating batch seeding script...']);
    try {
      const res = await fetch('/api/admin/supabase-sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSupabaseLogs(data.logs || []);
        alert('Universal Supabase Seed operation completed successfully!');
        fetchSupabaseStatus();
      } else {
        setSupabaseLogs(data.logs || [data.error || 'Sync failed. Click diagnostic logs.']);
        alert('Universal Supabase Sync completed with response warnings - check details block.');
      }
    } catch (err: any) {
      setSupabaseLogs(prev => [...prev, `CRITICAL SYSTEM EXCEPTION: ${err.message || err}`]);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const fetchSettings = () => {
    fetch('/api/system_config')
      .then(r => r.json())
      .then(data => {
        if (data.system_config) {
          setPrimaryAiProvider(data.system_config.ai_primary_provider);
          setGeminiModel(data.system_config.gemini_model_alias);
          setGroqKey(data.system_config.groq_key_configured ? '••••••••••••••••' : '');
          setCfWorkersUrl(data.system_config.cf_url || '');
          setOhPm(data.system_config.oh_pm_governance ?? 10);
          setOhBa(data.system_config.oh_business_analysis ?? 15);
          setOhUx(data.system_config.oh_ui_ux ?? 8);
          setOhQa(data.system_config.oh_qa ?? 15);
          setOhSecurity(data.system_config.oh_security ?? 5);
          setOhUat(data.system_config.oh_uat_support ?? 10);
          setOhDeployment(data.system_config.oh_deployment ?? 5);
          setOhRisk(data.system_config.oh_risk ?? 10);
        }
      })
      .catch(console.error);
  };

  const loadAudits = () => {
    if (!currentProject.project) return;
    fetch(`/api/audits?projectId=${currentProject.project.id}`)
      .then(r => r.json())
      .then(data => setAuditLogs(data))
      .catch(console.error);
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    try {
      const res = await fetch('/api/system_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_primary_provider: primaryAiProvider,
          gemini_model_alias: geminiModel,
          cf_url: cfWorkersUrl,
          oh_pm_governance: Number(ohPm),
          oh_business_analysis: Number(ohBa),
          oh_ui_ux: Number(ohUx),
          oh_qa: Number(ohQa),
          oh_security: Number(ohSecurity),
          oh_uat_support: Number(ohUat),
          oh_deployment: Number(ohDeployment),
          oh_risk: Number(ohRisk)
        })
      });

      if (res.ok) {
        alert('Universal Estimation & Overhead Configuration settings recorded and cached!');
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverheadsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    try {
      const res = await fetch('/api/system_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_primary_provider: primaryAiProvider,
          gemini_model_alias: geminiModel,
          cf_url: cfWorkersUrl,
          oh_pm_governance: Number(ohPm),
          oh_business_analysis: Number(ohBa),
          oh_ui_ux: Number(ohUx),
          oh_qa: Number(ohQa),
          oh_security: Number(ohSecurity),
          oh_uat_support: Number(ohUat),
          oh_deployment: Number(ohDeployment),
          oh_risk: Number(ohRisk)
        })
      });

      if (res.ok) {
        alert('Global estimation overhead percentages updated successfully!');
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulations trigges - Prompt 10 details
  const triggerPresenceSimulation = () => {
    alert('Simulated concurrent estimators joined workspace: "Mohammad K. (SAR rate validator)", "Sarah L. (Principal Architect)". Their active cursor tracks are now showing in presence feeds.');
  };

  const triggerConflictSimulation = () => {
    setShowSimMismatch(true);
  };

  const handleConflictResolve = async (action: 'overwrite' | 'load') => {
    setShowSimMismatch(false);
    setIsSyncing(true);
    setTimeout(async () => {
      setIsSyncing(false);
      if (action === 'load') {
        // Reload project
        if (currentProject.project) {
          const detailRes = await fetch(`/api/projects/${currentProject.project.id}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setProjectScope({
              project: data.project,
              stories: data.stories || [],
              classifications: data.classifications || [],
              overrides: data.overrides || [],
              movements: data.movements || [],
              criteria: data.criteria || [],
              scores: data.scores || [],
              overheads: data.overheads || [],
              ratings: data.ratings || [],
              costConfig: data.costConfig || null
            });
          }
        }
        alert('Synchronized! Successfully loaded current remote branch revision status.');
      } else {
        // Overwrite - push manual upsert to server
        if (currentProject.project) {
          await fetch(`/api/projects/${currentProject.project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentProject.project)
          });
        }
        alert('Synchronized! Overruled remote changes and committed local coordinates successfully.');
      }
      loadAudits();
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">

      {/* Simulation Workspace Conflict Toast (Prompt 10 requirements details) */}
      {showSimMismatch && (
        <div id="simulated-conflict-toast" className="bg-rose-55 border-l-4 border-rose-600 p-5 rounded-xl text-xs font-sans text-rose-950 flex flex-col md:flex-row items-start justify-between gap-4 shadow-xl animate-bounce-short">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Simulated Save Conflict Exception Triggered !</span>
            </div>
            <p className="text-rose-900 pr-4 leading-normal">
              A write collision was detected: Estimator "Sarah L." updated the database at <strong>{new Date().toLocaleTimeString()}</strong>, while your local buffer revisions differ. Choose your sync resolution profile:
            </p>
          </div>
          <div className="flex items-center gap-2 select-none shrink-0 self-center">
            <button
              id="conflict-btn-resolve-load"
              onClick={() => handleConflictResolve('load')}
              className="bg-rose-100 hover:bg-rose-200 text-rose-850 border border-rose-200 font-bold px-3 py-1.5 rounded transition cursor-pointer"
            >
              Load Remote File
            </button>
            <button
              id="conflict-btn-resolve-overwrite"
              onClick={() => handleConflictResolve('overwrite')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded transition cursor-pointer"
            >
              Overwrite DB
            </button>
          </div>
        </div>
      )}

      {/* Concurrent User and save mismatch Sim panel */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-sans font-extrabold text-slate-800 text-xs mb-0.5 leading-none">Diagnostic Collision & Simulation Suite</h4>
          <span className="text-[10px] font-sans text-slate-400">Trigger test vectors for concurrent team operations and write lockouts.</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Simulate Presence button */}
          <button
            id="admin-btn-sim-users"
            onClick={triggerPresenceSimulation}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg transition"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>Simulate Presence</span>
          </button>

          {/* Simulate Conflict button */}
          <button
            id="admin-btn-sim-conflict"
            onClick={triggerConflictSimulation}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs py-2 px-4 rounded-lg transition"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Simulate Save Conflict</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Universal AI settings form - Left side */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Cpu className="w-4.5 h-4.5 text-teal-600" />
            <h4 className="font-sans font-extrabold text-xs text-slate-850 tracking-tight">AI Engine Coordinates</h4>
          </div>

          <form onSubmit={handleSettingsSave} className="space-y-4 text-xs font-sans text-slate-650">
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Primary AI Provider</label>
              <select
                id="admin-select-provider"
                disabled={isViewer}
                value={primaryAiProvider}
                onChange={(e) => setPrimaryAiProvider(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs focus:outline-none focus:border-teal-500"
              >
                <option value="gemini">Google Gemini AI Core</option>
                <option value="groq">Groq Cloud AI Engine</option>
                <option value="cf_workers">Cloudflare Workers Heuristic AI</option>
              </select>
            </div>

            {primaryAiProvider === 'gemini' && (
              <div className="space-y-1 animate-fade-in animate-slide-up">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Active Gemini Model</label>
                <select
                  id="admin-select-gemini-model"
                  disabled={isViewer}
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Lightning Fast)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (High Analytical Reasoning)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Legacy Complex)</option>
                </select>
              </div>
            )}

            {primaryAiProvider === 'groq' && (
              <div className="space-y-1 animate-fade-in animate-slide-up">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">Groq API Token</label>
                <input
                  id="admin-input-groq-key"
                  type="password"
                  disabled={isViewer}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="Paste GROQ_API_KEY..."
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            )}

            {primaryAiProvider === 'cf_workers' && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-[9px] font-mono uppercase font-bold text-slate-450 block">CF Workers endpoint URL</label>
                <input
                  id="admin-input-cf-url"
                  type="text"
                  disabled={isViewer}
                  value={cfWorkersUrl}
                  onChange={(e) => setCfWorkersUrl(e.target.value)}
                  placeholder="https://my-worker.workers.dev"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            )}

            {!isViewer && (
              <button
                id="admin-btn-save-settings"
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg shadow-xs transition cursor-pointer"
              >
                Submit Server Settings
              </button>
            )}
          </form>
        </div>

        {/* Workspace Audit Logs tracker - Right side */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 max-h-[400px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-slate-650" />
              <h4 className="font-sans font-extrabold text-xs text-slate-850 tracking-tight">Project revision Audit Trail</h4>
            </div>

            <button
              id="admin-btn-refresh-audits"
              onClick={loadAudits}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Refresh Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 font-sans text-xs text-slate-600">
            {auditLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                No audited operations compiled yet. Edit settings or add stories to populating trails.
              </div>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={log.id || idx} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-2">
                  <div className="space-y-1 select-text">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-850 bg-slate-100 px-1.5 py-0.2 rounded text-[10px] uppercase font-mono tracking-wide">{log.operation_type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-550 italic leading-snug">"{log.description}"</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">BY: {log.user_identity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Global Default Estimation Overheads configuration card */}
      <div id="global-overheads-config-dashboard" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="font-sans font-extrabold text-sm text-slate-950 tracking-tight">Global Estimation Overheads Config (%)</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans animate-pulse">
                Configure standard default percentages (%) for estimating project overheads. These standard 8 elements are seeded for new projects automatically.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleOverheadsSave} className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">PM + Governance (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-pm"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohPm}
                  onChange={(e) => setOhPm(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">Business Analysis (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-ba"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohBa}
                  onChange={(e) => setOhBa(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">UI/UX (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-ux"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohUx}
                  onChange={(e) => setOhUx(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">Quality Assurance (QA) (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-qa"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohQa}
                  onChange={(e) => setOhQa(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">Security (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-security"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohSecurity}
                  onChange={(e) => setOhSecurity(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">UAT Support (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-uat"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohUat}
                  onChange={(e) => setOhUat(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">Deployment (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-deployment"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohDeployment}
                  onChange={(e) => setOhDeployment(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-black text-slate-500 block">Risk (%)</label>
              <div className="relative">
                <input
                  id="admin-oh-risk"
                  type="number"
                  min="0"
                  max="100"
                  disabled={isViewer}
                  value={ohRisk}
                  onChange={(e) => setOhRisk(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-none focus:border-indigo-505 pr-7 font-black text-slate-800"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-400">%</span>
              </div>
            </div>
          </div>

          {!isViewer && (
            <div className="flex justify-end pt-2">
              <button
                id="admin-btn-save-ohs"
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-sm transition cursor-pointer"
              >
                Save Global Overhead defaults
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Supabase Database Integration Dashboard */}
      <div id="supabase-sync-dashboard" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
            <div>
              <h4 className="font-sans font-extrabold text-xs text-slate-850 tracking-tight">Supabase Production Database Synchronizer</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Toggle off-line JSON capabilities and scale real-time variables to PostgreSQL.</p>
            </div>
          </div>
          <button
            id="supabase-refresh-btn"
            onClick={fetchSupabaseStatus}
            disabled={isCheckingSupabase}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 border border-slate-200 font-semibold text-xs rounded transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSupabase ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        {!supabaseStatus ? (
          <div className="flex items-center justify-center p-8 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs text-center">
            Retrieving production connectivity state. Please wait...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans text-slate-650">
            <div className="space-y-3 md:border-r md:border-slate-100 md:pr-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Endpoint Cluster</span>
                <p className="font-mono text-[11px] bg-slate-50 p-2 rounded truncate text-slate-650" title={supabaseStatus.connection_endpoint || 'Not Configured'}>
                  {supabaseStatus.connection_endpoint || 'ENV: "SUPABASE_URL" Not Configured'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Integration Profile</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${supabaseStatus.active ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="font-semibold text-slate-750">
                    {supabaseStatus.active
                      ? (supabaseStatus.isConfigCompleted ? 'Active Service Integration' : 'Partially Configured')
                      : 'Inactive / Fallback Local JSON DB Mode'
                    }
                  </span>
                </div>
                <p className="text-[10px] text-slate-450 leading-relaxed mt-1">
                  {supabaseStatus.reason}
                </p>
              </div>

              {supabaseStatus.active && (
                <div className="pt-2 select-none">
                  <button
                    id="supabase-sync-btn"
                    disabled={isSyncingSupabase}
                    onClick={handleSupabaseSync}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded shadow-sm transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                    <span>Upload & Seed Local Dataset</span>
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-2">PostgreSQL Table Matrix Status</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(supabaseStatus.results || {}).map(([key, val]: any) => (
                    <div key={key} className="border border-slate-150 p-2.5 rounded-lg bg-slate-50/55 flex flex-col justify-between gap-1.5 shadow-xs">
                      <span className="text-[10px] font-mono font-semibold text-slate-755 truncate" title={key}>{key}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold self-start ${val === 'ACTIVE' ? 'bg-emerald-50 text-emerald-750 border border-emerald-200' :
                          val === 'ERROR' ? 'bg-rose-50 text-rose-750 border border-rose-200 animate-pulse' :
                            'bg-slate-100 text-slate-500 border border-slate-150'
                        }`}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-[11px] text-slate-700 leading-normal space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Supabase Integration & RLS Guideline</span>
                </div>
                <p className="text-slate-655 text-xs">
                  If tables show <strong>ERROR</strong> or <strong>MISSING</strong>, execute the prepared table declaration script from the <code>supabase_schema.sql</code> file at your project root in your Supabase SQL Editor.
                </p>
                <div className="border-t border-slate-200 pt-2 space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-750 block">🔐 Resolving "Violates Row-Level Security Policy" Sync Logs:</span>
                  <p className="text-slate-600 leading-relaxed">
                    By default, PostgreSQL Row Level Security (RLS) is enabled on all tables. If you want to sync without user account restrictions, run either of the following commands in your Supabase dashboard:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-slate-655 font-mono text-[10px] bg-white p-2 border border-slate-150 rounded">
                    <li>Option A: Copy & execute <code>ALTER TABLE &lt;table_name&gt; DISABLE ROW LEVEL SECURITY;</code> to disable it.</li>
                    <li>Option B: Execute the <code>CREATE POLICY ...</code> rules inside <code>supabase_schema.sql</code> to enable sandbox permissive roles.</li>
                    <li>Ensure <code>SUPABASE_SERVICE_ROLE_KEY</code> in environment variables is the exact superuser secret (Admin Service Role Key) to bypass all RLS by default!</li>
                  </ul>
                </div>

                <div className="border-t border-slate-200 pt-2 space-y-1.5 text-xs">
                  <span className="font-semibold text-emerald-700 block">🔑 Resolving "Violates Foreign Key Constraint" Seeding Logs:</span>
                  <p className="text-slate-600 leading-relaxed">
                    If syncing a sandbox dataset fails because <code>user_profiles</code> lacks the matching authenticated accounts in <code>auth.users</code>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-slate-655 font-mono text-[10px] bg-white p-2 border border-slate-150 rounded animate-pulse">
                    <li>Execute: <code>ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;</code> to allow direct seeding of pre-configured profiles!</li>
                  </ul>
                </div>
              </div>

              {supabaseLogs.length > 0 && (
                <div id="supabase-console-logs" className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-lg space-y-1 max-h-[120px] overflow-y-auto">
                  <div className="text-[9px] text-slate-500 border-b border-slate-800 pb-1 flex justify-between">
                    <span>TRANSACTION SYNC OUTPUT LOGS</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                  {supabaseLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed select-text">
                      <span className="text-slate-500 mr-1.5">›</span>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
