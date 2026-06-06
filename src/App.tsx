import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useProject, ProjectProvider } from './context/ProjectContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LoadProjectModal from './components/project/LoadProjectModal';
import CreateProjectModal from './components/project/CreateProjectModal';

// Tabs
import ProposalsLanding from './components/project/ProposalsLanding';
import ProjectSetup from './components/project/ProjectSetup';
import UserStories from './components/stories/UserStories';
import FpaTab from './components/fpa/FpaTab';
import CosmicTab from './components/cosmic/CosmicTab';
import HybridMcdaTab from './components/mcda/HybridMcdaTab';
import CalibrationFeedback from './components/feedback/CalibrationFeedback';
import ComparativeDashboard from './components/dashboard/ComparativeDashboard';
import AdminSettings from './components/admin/AdminSettings';
import QaTestsSuite from './components/qa/QaTestsSuite';

function WorkspaceLayout() {
  const [activeTab, setActiveTab] = useState<'proposals' | 'setup' | 'stories' | 'fpa' | 'cosmic' | 'hybrid' | 'calibration' | 'dashboard' | 'settings' | 'qa-tests'>('proposals');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentProject } = useProject();

  const handleNewProject = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans relative">
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-30 transition-opacity duration-200"
        />
      )}

      {/* Main Workspace content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC] min-w-0">
        
        {/* TopBar controls */}
        <TopBar 
          onNewProject={handleNewProject} 
          onLoadProject={() => setShowLoadModal(true)} 
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        {/* Dynamic active screen container */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {activeTab === 'proposals' && (
            <ProposalsLanding onSelectTab={setActiveTab} onOpenCreateModal={handleNewProject} />
          )}

          {activeTab === 'setup' && (
            <ProjectSetup onShowLoadModal={() => setShowLoadModal(true)} />
          )}

          {activeTab === 'stories' && (
            <UserStories />
          )}

          {activeTab === 'fpa' && (
            <FpaTab />
          )}

          {activeTab === 'cosmic' && (
            <CosmicTab />
          )}

          {activeTab === 'hybrid' && (
            <HybridMcdaTab />
          )}

          {activeTab === 'calibration' && (
            <CalibrationFeedback />
          )}

          {activeTab === 'dashboard' && (
            <ComparativeDashboard />
          )}

          {activeTab === 'qa-tests' && (
            <QaTestsSuite />
          )}

          {activeTab === 'settings' && (
            <AdminSettings />
          )}
        </main>

        {/* Refined clean client-facing footer to avoid telemetry larping clutter */}
        <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-500 font-sans select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-indigo-700 tracking-tight">SPEC-CLOUD.ESTIMATE</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Multi-Model Decision Support Decision Engine</span>
          </div>
          {currentProject.project ? (
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-450">Active Scope:</span>
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded font-mono font-bold text-[10px]">
                {currentProject.project.name}
              </span>
            </div>
          ) : (
            <div className="text-slate-400 italic">No Proposal Loaded</div>
          )}
        </footer>
      </div>

      {/* Load Project selector list modal */}
      {showLoadModal && (
        <LoadProjectModal 
          onClose={() => setShowLoadModal(false)}
          onNewProjectOpen={handleNewProject}
        />
      )}

      {showCreateModal && (
        <CreateProjectModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setActiveTab('proposals')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <WorkspaceLayout />
      </ProjectProvider>
    </AuthProvider>
  );
}
