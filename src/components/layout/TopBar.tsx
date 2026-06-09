import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  PlusCircle,
  FolderOpen,
  Save,
  Users,
  Cpu,
  CheckCircle2,
  Edit3,
  Menu
} from 'lucide-react';

interface TopBarProps {
  onNewProject: () => void;
  onLoadProject: () => void;
  onToggleSidebar: () => void;
}

export default function TopBar({ onNewProject, onLoadProject, onToggleSidebar }: TopBarProps) {
  const { currentProject, saveProject } = useProject();
  const { isViewer } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [systemSetting, setSystemSetting] = useState<any>(null);

  useEffect(() => {
    if (currentProject.project) {
      setProjectName(currentProject.project.name);
    }
  }, [currentProject.project]);

  useEffect(() => {
    fetch('/api/system_config')
      .then(r => r.json())
      .then(data => setSystemSetting(data))
      .catch(console.error);
  }, []);

  const handleRename = async () => {
    if (!projectName.trim() || !currentProject.project) {
      setIsEditingName(false);
      return;
    }
    await saveProject({ name: projectName });
    setIsEditingName(false);
    showSaveSuccess();
  };

  const showSaveSuccess = () => {
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleManualSave = async () => {
    if (!currentProject.project || isViewer) return;
    await saveProject({});
    showSaveSuccess();
  };

  const formatEditDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Find active AI Model indicator
  const activeAiProvider = systemSetting?.system_config?.ai_primary_provider || 'gemini';

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Current Project Details */}
      <div className="flex items-center gap-4 flex-1 truncate max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition mr-1 shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        {currentProject.project ? (
          <div className="flex items-center gap-2 truncate">
            {isEditingName ? (
              <input
                id="header-project-name-input"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setProjectName(currentProject.project?.name || '');
                    setIsEditingName(false);
                  }
                }}
                className="font-sans font-semibold text-sm text-slate-900 border-b-2 border-indigo-500 focus:outline-none px-1 py-0.5 bg-slate-50 rounded"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 truncate">
                <span
                  id="header-project-name-display"
                  onClick={() => !isViewer && setIsEditingName(true)}
                  className={`font-sans font-semibold text-xs text-slate-900 truncate tracking-tight ${!isViewer ? 'cursor-pointer hover:bg-slate-50 hover:text-indigo-600 rounded px-1' : ''}`}
                  title="Click to rename project"
                >
                  {currentProject.project.name}
                </span>
                {!isViewer && <Edit3 className="w-3.2 h-3.2 text-slate-400 cursor-pointer" onClick={() => setIsEditingName(true)} />}
              </div>
            )}

            <div className="h-4 w-px bg-slate-200" />
            <span className="text-[9px] font-mono text-slate-400 tracking-wider">
              REVISION SYNC: {formatEditDate(currentProject.project.updated_at)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span id="header-no-project" className="font-sans text-xs text-slate-400 font-medium tracking-tight">No Proposal Loaded</span>
          </div>
        )}
      </div>

      {/* Save Success Indicator */}
      {saveIndicator && (
        <div id="save-indicator" className="flex items-center gap-1 text-green-600 text-[10px] font-bold animate-fade-in mr-4 tracking-wider uppercase">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>SAVED SUCCESS ✓</span>
        </div>
      )}

      {/* Dynamic AI Badge config */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
          <Cpu className="w-3 h-3 text-indigo-500" />
          <div className="text-left">
            <span className="text-[8px] font-mono text-slate-400 block leading-none font-bold uppercase">AI ORBIT</span>
            <span
              id="ai-provider-badge"
              className={`text-[9px] uppercase font-black tracking-widest leading-none ${activeAiProvider === 'gemini'
                  ? 'text-indigo-605'
                  : activeAiProvider === 'groq'
                    ? 'text-sky-600'
                    : 'text-green-605'
                }`}
            >
              {activeAiProvider} CORE
            </span>
          </div>
        </div>

        {/* Presence Avatars */}
        <div className="flex items-center -space-x-1 shrink-0 select-none">
          <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-[7px] font-black text-white uppercase" title="Umesh S. (You)">
            US
          </div>
          <div className="w-5.5 h-5.5 rounded-full bg-purple-500 border border-white flex items-center justify-center text-[7px] font-black text-white uppercase" title="Gemini AI Agent">
            GM
          </div>
          <div className="w-5.5 h-5.5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] text-slate-600" title="Active Collaboration Workspace">
            <Users className="w-2.5 h-2.5" />
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Action Buttons styled like high density triggers */}
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {!isViewer && (
            <button
              id="bar-btn-new"
              onClick={onNewProject}
              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>New</span>
            </button>
          )}

          <button
            id="bar-btn-load"
            onClick={onLoadProject}
            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Load</span>
          </button>

          {currentProject.project && !isViewer && (
            <button
              id="bar-btn-save"
              onClick={handleManualSave}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-650 px-3 py-1 rounded text-xs font-bold shadow-xs transition cursor-pointer animate-fade-in"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
