import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { 
  FolderGit2, 
  FileText, 
  Binary, 
  Orbit, 
  Layers, 
  Percent, 
  LayoutDashboard, 
  ShieldAlert, 
  ShieldCheck,
  LogOut,
  Sparkles,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: 'proposals' | 'setup' | 'stories' | 'fpa' | 'cosmic' | 'hybrid' | 'calibration' | 'dashboard' | 'settings' | 'qa-tests';
  setActiveTab: (tab: 'proposals' | 'setup' | 'stories' | 'fpa' | 'cosmic' | 'hybrid' | 'calibration' | 'dashboard' | 'settings' | 'qa-tests') => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { profile, signOut, isAdmin, updateProfile } = useAuth();
  const { currentProject } = useProject();

  const totalStories = currentProject.stories.length;
  const classifiedCount = currentProject.stories.filter(s => s.ai_status === 'classified' || s.ai_status === 'overridden').length;
  
  // Status check helper values
  const stepStatus = {
    proposals: 'green',
    setup: currentProject.project ? 'green' : 'grey',
    stories: totalStories > 0 ? 'green' : 'grey',
    fpa: classifiedCount > 0 ? (classifiedCount === totalStories ? 'green' : 'amber') : 'grey',
    cosmic: currentProject.movements.length > 0 ? 'green' : 'grey',
    hybrid: currentProject.scores.length > 0 ? 'green' : 'grey',
    cost: currentProject.costConfig ? 'green' : 'grey',
    summary: totalStories > 0 && classifiedCount > 0 ? 'green' : 'grey'
  };

  const menuItems = [
    { id: 'proposals' as const, name: 'Proposals Dashboard', icon: FolderGit2, status: stepStatus.proposals },
    { id: 'dashboard' as const, name: 'Summary Dashboard', icon: LayoutDashboard, status: stepStatus.summary },
    { id: 'stories' as const, name: 'User Stories', icon: FileText, status: stepStatus.stories },
    { id: 'fpa' as const, name: 'FPA Analysis', icon: Binary, status: stepStatus.fpa },
    { id: 'cosmic' as const, name: 'COSMIC Points', icon: Orbit, status: stepStatus.cosmic },
    { id: 'hybrid' as const, name: 'Hybrid Model', icon: Layers, status: stepStatus.hybrid },
    { id: 'calibration' as const, name: 'Overheads & Cost', icon: Percent, status: stepStatus.cost },
    { id: 'setup' as const, name: 'Project Parameters', icon: Settings, status: stepStatus.setup },
    ...(isAdmin ? [{ id: 'qa-tests' as const, name: 'System QA Test Suite', icon: ShieldCheck, status: 'green' as const }] : [])
  ];

  return (
    <div 
      id="app-sidebar" 
      className={`fixed md:static inset-y-0 left-0 w-64 bg-slate-50 text-slate-800 flex flex-col h-screen border-r border-slate-200 z-40 transition-transform duration-200 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Logo header matching the SPEC-CLOUD design spacing */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white h-14 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
            SPEC-CLOUD<span className="text-indigo-600 font-extrabold">.ESTIMATE</span>
          </h1>
        </div>
        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-slate-500 uppercase tracking-wider">v2.4.0</span>
      </div>

      {/* Estimator Profile details - compact design */}
      <div className="p-3 border-b border-slate-200 bg-white select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-indigo-600 uppercase text-xs border border-slate-200">
            {profile?.full_name?.substring(0, 2) || 'US'}
          </div>
          <div className="overflow-hidden flex-1">
            <h4 className="font-sans font-semibold text-xs text-slate-900 truncate leading-tight">{profile?.full_name || 'Umesh Sharma'}</h4>
            <span className="text-[9px] font-mono text-slate-400 block truncate leading-none mt-0.5">{profile?.organisation || 'Default Org'}</span>
          </div>
          <span className="text-[8px] font-mono font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-150 px-1 rounded uppercase">
            {profile?.role || 'estimator'}
          </span>
        </div>
      </div>

      {/* Menu / Nav items list */}
      <div className="p-2 border-b border-slate-150 bg-slate-50/50">
        <h2 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-2 py-1">Execution Queue</h2>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`sidebar-tab-${item.id}`}
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded text-xs font-semibold transition-all outline-none border ${
                isActive 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' 
                  : 'text-slate-600 border-transparent hover:bg-slate-100/70 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.7 h-3.7 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </div>
              
              {/* Responsive status pill indicators */}
              <div className="flex items-center">
                {item.status === 'green' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 ring-2 ring-green-100" />
                )}
                {item.status === 'amber' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ring-2 ring-amber-100" />
                )}
                {item.status === 'grey' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
            </button>
          );
        })}

        {/* Separator */}
        {isAdmin && (
          <>
            <div className="pt-2 border-t border-slate-200 my-2" />
            <button
              id="sidebar-tab-settings"
              onClick={() => {
                setActiveTab('settings');
                onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded text-xs font-semibold transition-all outline-none border ${
                activeTab === 'settings' 
                  ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs' 
                  : 'text-slate-600 border-transparent hover:bg-rose-50/50 hover:text-rose-700'
              }`}
            >
              <ShieldAlert className="w-3.7 h-3.7 text-rose-500" />
              <span>Admin Panel Settings</span>
            </button>
          </>
        )}
      </nav>

      {/* Quick Role Toggle Bar so users can interact and test role permissions easily */}
      <div className="p-2 border-t border-slate-250 bg-white">
        <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase tracking-wider text-center mb-1">Interactive Demo Bypass</label>
        <div className="grid grid-cols-3 gap-1">
          {['admin', 'estimator', 'viewer'].map((r) => (
            <button
              key={r}
              onClick={async () => {
                await updateProfile({ role: r as any });
              }}
              className={`px-1 py-1 rounded text-[8px] font-mono uppercase font-black text-center border transition-all ${
                profile?.role === r 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Sign Out Action at bottom */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="w-3.7 h-3.7 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
