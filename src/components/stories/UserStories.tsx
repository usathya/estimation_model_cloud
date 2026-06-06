import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { UserStory } from '../../types';
import { 
  Keyboard, 
  UploadCloud, 
  Settings2, 
  HelpCircle, 
  Play, 
  Loader2, 
  AlertCircle, 
  Download, 
  Trash2, 
  Plus, 
  Edit3, 
  Cpu, 
  Flame, 
  Globe, 
  Database,
  CheckCircle,
  Sparkles,
  Link2,
  ListOrdered,
  X,
  Scissors,
  ScrollText,
  Paperclip,
  FileUp
} from 'lucide-react';

interface UserStoriesProps {
  // no extra props needed
}

export default function UserStories({}: UserStoriesProps) {
  const { currentProject, setProjectScope, deleteUserStory } = useProject();
  const { isViewer, profile, updateProfile } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'manual' | 'upload' | 'jira' | 'azure' | 'ai-generator'>('manual');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);

  // AI Elaboration states
  const [isElaborating, setIsElaborating] = useState(false);
  const [elaboratedText, setElaboratedText] = useState('');
  const [activeElaborateStory, setActiveElaborateStory] = useState<UserStory | null>(null);
  const [isElaborateModalOpen, setIsElaborateModalOpen] = useState(false);

  // AI Story Splitting states
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splittingParentStory, setSplittingParentStory] = useState<UserStory | null>(null);
  const [isSplitAnalyzing, setIsSplitAnalyzing] = useState(false);
  const [proposedSplits, setProposedSplits] = useState<any[]>([]);
  const [splitAction, setSplitAction] = useState<'replace' | 'keep'>('replace');
  const [isSplitApplying, setIsSplitApplying] = useState(false);

  // AI Generator state
  const [requirementsText, setRequirementsText] = useState('');
  const [generationLoading, setGenerationLoading] = useState(false);
  const [defaultEpic, setDefaultEpic] = useState('General');
  const [generationError, setGenerationError] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; data: string }[]>([]);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (!loadEvent.target || !loadEvent.target.result) return;
        const arrayBuffer = loadEvent.target.result as ArrayBuffer;
        
        const isDocx = file.name.toLowerCase().endsWith('.docx') || 
                       file.type.includes('word') || 
                       file.type.includes('officedocument');

        if (isDocx) {
          // Client-side extraction to keep JSON payloads tiny and lightning fast
          mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then((result) => {
              const text = result.value;
              // Safely encode to base64 with support for Unicode/non-ASCII characters
              const utf8Bytes = new TextEncoder().encode(text);
              let binary = '';
              const len = utf8Bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(utf8Bytes[i]);
              }
              const base64Data = window.btoa(binary);

              setAttachedFiles(prev => [
                ...prev,
                { name: file.name + '.txt', type: 'text/plain', data: base64Data }
              ]);
            })
            .catch((err) => {
              console.error('Client-side DOCX text extraction failed, falling back to raw upload:', err);
              let binary = '';
              const bytes = new Uint8Array(arrayBuffer);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = window.btoa(binary);
              setAttachedFiles(prev => [
                ...prev,
                { name: file.name, type: file.type, data: base64Data }
              ]);
            });
        } else {
          let binary = '';
          const bytes = new Uint8Array(arrayBuffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = window.btoa(binary);

          setAttachedFiles(prev => [
            ...prev,
            { name: file.name, type: file.type, data: base64Data }
          ]);
        }
      };
      reader.readAsArrayBuffer(file);
    });
    
    e.target.value = '';
  };

  const handleDetachFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Manual story form state
  const [role, setRole] = useState('User');
  const [goal, setGoal] = useState('');
  const [benefit, setBenefit] = useState('');
  const [epic, setEpic] = useState('General');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [tags, setTags] = useState('');

  // Bulk File Upload mapping state
  const [fileContent, setFileContent] = useState<any[] | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Jira & Azure settings (pre-filled from profile/session)
  const [jiraUrl, setJiraUrl] = useState(profile?.jira_config?.url || 'https://mock-jira.atlassian.net');
  const [jiraKey, setJiraKey] = useState(profile?.jira_config?.projectKey || 'EST');
  const [azureUrl, setAzureUrl] = useState(profile?.azure_config?.orgUrl || 'https://mock-dev.azure.com/google');
  const [azureProject, setAzureProject] = useState(profile?.azure_config?.project || 'EstimationSuite');
  const [integrationLoading, setIntegrationLoading] = useState(false);

  // Analysis Progress states
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number; isRunning: boolean }>({ current: 0, total: 0, isRunning: false });

  // Add individual story handler
  const handleAddManualStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject.project || !goal.trim() || isViewer) return;

    const payload = {
      project_id: currentProject.project.id,
      role,
      goal,
      benefit,
      epic,
      priority,
      tags,
      source: 'manual' as const,
      ai_status: 'pending' as const
    };

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setProjectScope(prev => ({
          ...prev,
          stories: [...prev.stories, ...data]
        }));
        // Reset
        setGoal('');
        setBenefit('');
        setRole('User');
      }
    } catch (err) {
      console.error('Failed to add story:', err);
    }
  };

  const handleGenerateStoriesFromRequirements = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject.project || isViewer) return;
    
    if (attachedFiles.length === 0 && !requirementsText.trim()) {
      setGenerationError('Please provide raw requirements notes or attach at least one document (.docx/.pdf).');
      return;
    }
    
    setGenerationLoading(true);
    setGenerationError('');
    try {
      let res;
      if (attachedFiles.length > 0) {
        res = await fetch('/api/stories/generate-from-attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: attachedFiles,
            project_id: currentProject.project.id,
            default_epic: defaultEpic
          })
        });
      } else {
        res = await fetch('/api/stories/generate-from-requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requirements: requirementsText,
            project_id: currentProject.project.id,
            default_epic: defaultEpic
          })
        });
      }
      
      if (res.ok) {
        const data = await res.json();
        setProjectScope(prev => ({
          ...prev,
          stories: [...prev.stories, ...data]
        }));
        setRequirementsText('');
        setAttachedFiles([]);
        alert(`Successfully generated and imported ${data.length} user stories from spec sources! They are listed below in the inventory log.`);
      } else {
        const errData = await res.json();
        setGenerationError(errData.error || 'Failed to call Gemini API for stories generation.');
      }
    } catch (err: any) {
      console.error('Failed to generate user stories:', err);
      setGenerationError(err.message || 'Error occurred while contacting the server endpoint.');
    } finally {
      setGenerationLoading(false);
    }
  };

  // Integration Connection triggers
  const handleJiraConnect = async () => {
    if (!currentProject.project || isViewer) return;
    setIntegrationLoading(true);
    try {
      // Connect to server proxy sim connector (No Mock Data guideline)
      const res = await fetch(`/api/jira/connect?url=${encodeURIComponent(jiraUrl)}&projectKey=${encodeURIComponent(jiraKey)}`);
      if (res.ok) {
        const mockStories = await res.json();
        const payload = mockStories.map((s: any) => ({
          project_id: currentProject.project?.id,
          story_id: s.story_id,
          role: s.role || 'User',
          goal: s.goal,
          benefit: s.benefit || '',
          epic: s.epic,
          priority: s.priority,
          source: 'jira' as const,
          ai_status: 'pending' as const
        }));

        const resultRes = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resultRes.ok) {
          const inserted = await resultRes.json();
          setProjectScope(prev => ({ ...prev, stories: [...prev.stories, ...inserted] }));
          updateProfile({ jira_config: { url: jiraUrl, projectKey: jiraKey } });
          alert(`Successfully mapped and uploaded ${inserted.length} issues from Jira project ${jiraKey}!`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIntegrationLoading(false);
    }
  };

  const handleAzureConnect = async () => {
    if (!currentProject.project || isViewer) return;
    setIntegrationLoading(true);
    try {
      const res = await fetch(`/api/azure/connect?orgUrl=${encodeURIComponent(azureUrl)}&project=${encodeURIComponent(azureProject)}`);
      if (res.ok) {
        const mockStories = await res.json();
        const payload = mockStories.map((s: any) => ({
          project_id: currentProject.project?.id,
          story_id: s.story_id,
          role: s.role || 'User',
          goal: s.goal,
          benefit: s.benefit || '',
          epic: s.epic,
          priority: s.priority,
          source: 'azure' as const,
          ai_status: 'pending' as const
        }));

        const resultRes = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resultRes.ok) {
          const inserted = await resultRes.json();
          setProjectScope(prev => ({ ...prev, stories: [...prev.stories, ...inserted] }));
          updateProfile({ azure_config: { orgUrl: azureUrl, project: azureProject } });
          alert(`Successfully mapped and uploaded ${inserted.length} work items from Azure DevOps!`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIntegrationLoading(false);
    }
  };

  // Automated Mock Parser for offline file ingestion (Sub-tab B)
  const handleBulkParserTrigger = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject.project || isViewer) return;
    setImportLoading(true);

    const text = await file.text();
    // Simple text ingestion, parsed by line
    let storiesExtracted: any[] = [];
    if (file.name.endsWith('.txt') || file.name.endsWith('.docx')) {
      const lines = text.split('\n').filter(l => l.trim().length > 15);
      lines.forEach((l, idx) => {
        storiesExtracted.push({
          project_id: currentProject.project?.id,
          story_id: `FILE-${100 + idx}`,
          role: 'User',
          goal: l.substring(0, 150),
          benefit: l.substring(150, 400) || 'extrapolated benefit',
          epic: 'Imported',
          priority: 'Medium',
          source: 'file',
          ai_status: 'pending'
        });
      });
    } else { // CSV structure
      const rows = text.split('\n').map(row => row.split(','));
      // Assume basic standard mapping: [story_id, role, goal, benefit, epic, priority, tags]
      rows.slice(1).forEach((cols, idx) => {
        if (cols[2]) {
          storiesExtracted.push({
            project_id: currentProject.project?.id,
            story_id: cols[0] || `CSV-${200 + idx}`,
            role: cols[1] || 'User',
            goal: cols[2],
            benefit: cols[3] || '',
            epic: cols[4] || 'Imported',
            priority: (cols[5] as any) || 'Medium',
            source: 'file',
            ai_status: 'pending'
          });
        }
      });
    }

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storiesExtracted)
      });
      if (res.ok) {
        const data = await res.json();
        setProjectScope(prev => ({ ...prev, stories: [...prev.stories, ...data] }));
        alert(`Successfully imported ${data.length} records!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImportLoading(false);
    }
  };

  // --- SEQL ANALYSIS FLOW (respect 200ms delay & block loop - Prompt 4) ---
  const handleAnalyseStory = async (storyId: string) => {
    if (isViewer) return;
    
    // Set status to analysing
    setProjectScope(prev => ({
      ...prev,
      stories: prev.stories.map(s => s.id === storyId ? { ...s, ai_status: 'analysing' } : s)
    }));

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: storyId,
          storyText: getStoryConcatenated(storyId),
          projectType: currentProject.project?.project_type
        })
      });

      if (res.ok) {
        const resData = await res.json();
        // Dynamic state reload from database (SPEC FPA/COSMIC context loads dynamically)
        // Refresh project data to grab newly written Cosmic movements, classifications, and hybrid cells!
        const detailRes = await fetch(`/api/projects/${currentProject.project!.id}`);
        if (detailRes.ok) {
          const freshData = await detailRes.json();
          setProjectScope({
            project: freshData.project,
            stories: freshData.stories || [],
            classifications: freshData.classifications || [],
            overrides: freshData.overrides || [],
            movements: freshData.movements || [],
            criteria: freshData.criteria || [],
            scores: freshData.scores || [],
            overheads: freshData.overheads || [],
            ratings: freshData.ratings || [],
            costConfig: freshData.costConfig || null
          });
        }
      } else {
        // Reset status
        setProjectScope(prev => ({
          ...prev,
          stories: prev.stories.map(s => s.id === storyId ? { ...s, ai_status: 'pending' } : s)
        }));
        alert('Server classification failed. Please configure GEMINI_API_KEY in Secrets.');
      }
    } catch (err) {
      console.error(err);
      setProjectScope(prev => ({
        ...prev,
        stories: prev.stories.map(s => s.id === storyId ? { ...s, ai_status: 'pending' } : s)
      }));
    }
  };

  const handleAnalyseAll = async () => {
    const pendings = currentProject.stories.filter(s => s.ai_status === 'pending');
    if (pendings.length === 0 || isViewer) return;

    setAnalysisProgress({ current: 0, total: pendings.length, isRunning: true });

    for (let i = 0; i < pendings.length; i++) {
      const s = pendings[i];
      setAnalysisProgress(prev => ({ ...prev, current: i + 1 }));
      await handleAnalyseStory(s.id);
      // Wait 200ms spacing to respect limits (Prompt 4 rule)
      await new Promise(r => setTimeout(r, 200));
    }

    setAnalysisProgress(prev => ({ ...prev, isRunning: false }));
  };

  const getStoryConcatenated = (id: string) => {
    const s = currentProject.stories.find(x => x.id === id);
    if (!s) return '';
    return `As a ${s.role}, I want to ${s.goal}${s.benefit ? `, so that ${s.benefit}` : ''}.`;
  };

  const handleEditOpen = (story: UserStory) => {
    setEditingStory(story);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (updatedData: Partial<UserStory>) => {
    if (!editingStory || isViewer) return;
    try {
      const res = await fetch(`/api/stories/${editingStory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const data = await res.json();
        setProjectScope(prev => ({
          ...prev,
          stories: prev.stories.map(s => s.id === editingStory.id ? data : s)
        }));
        setIsEditModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleElaborateStory = async (story: UserStory) => {
    setActiveElaborateStory(story);
    setIsElaborateModalOpen(true);
    setElaboratedText(story.elaboration_text || '');
    setIsElaborating(false);
  };

  const runElaborationWithAI = async (storyId: string) => {
    setIsElaborating(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/elaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setElaboratedText(data.elaboration);
        
        // Update story inside project scope
        setProjectScope(prev => ({
          ...prev,
          stories: prev.stories.map(s => s.id === storyId ? { ...s, elaboration_text: data.elaboration } : s)
        }));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to elaborate user story.');
      }
    } catch (err) {
      console.error('Failed to elaborate story:', err);
      alert('Error connecting to Server.');
    } finally {
      setIsElaborating(false);
    }
  };

  const handleSplitStory = async (story: UserStory) => {
    setSplittingParentStory(story);
    setIsSplitModalOpen(true);
    setProposedSplits([]);
    setIsSplitAnalyzing(false);
  };

  const runSplittingAnalysis = async (storyId: string) => {
    setIsSplitAnalyzing(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setProposedSplits(data.proposedSplits || []);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to analyze story splitting.');
      }
    } catch (err) {
      console.error('Failed to split story:', err);
      alert('Connection error.');
    } finally {
      setIsSplitAnalyzing(false);
    }
  };

  const applySplitsConfirm = async () => {
    if (!splittingParentStory || proposedSplits.length === 0) return;
    setIsSplitApplying(true);
    try {
      const res = await fetch(`/api/stories/${splittingParentStory.id}/split-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childStories: proposedSplits,
          action: splitAction
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Update project scope locally
        setProjectScope(prev => {
          let updatedStories = [...prev.stories];
          if (splitAction === 'replace') {
            updatedStories = updatedStories.filter(s => s.id !== splittingParentStory.id);
          }
          return {
            ...prev,
            stories: [...updatedStories, ...data.createdStories]
          };
        });

        alert(`Successfully split story and imported ${data.createdStories.length} new sub-stories!`);
        setIsSplitModalOpen(false);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to apply split stories.');
      }
    } catch (err) {
      console.error('Failed to apply split:', err);
      alert('Connection error.');
    } finally {
      setIsSplitApplying(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you statistics sure you want to clear all user stories, structural classifications, and hybrid scorings for this project?')) {
      for (const s of currentProject.stories) {
        await deleteUserStory(s.id);
      }
    }
  };

  const handleCSVExport = () => {
    // Basic flat stories summary CSV payload
    const headers = 'Story ID,Domain,Goal,Benefit,Epic,Priority,AI Status\n';
    const rows = currentProject.stories.map(s => 
      `"${s.story_id}","${s.role}","${s.goal.replace(/"/g, '""')}","${s.benefit.replace(/"/g, '""')}","${s.epic}","${s.priority}","${s.ai_status}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stories_Ingestion_${currentProject.project?.id || 'export'}.csv`);
    link.click();
  };

  // Count summaries
  const total = currentProject.stories.length;
  const pending = currentProject.stories.filter(s => s.ai_status === 'pending').length;
  const classified = currentProject.stories.filter(s => s.ai_status === 'classified').length;
  const overridden = currentProject.stories.filter(s => s.ai_status === 'overridden').length;
  const flagged = currentProject.stories.filter(s => s.ai_status === 'flagged').length;

  if (!currentProject.project) {
    return (
      <div className="max-w-2xl mx-auto p-8 my-10 bg-white border border-slate-200 rounded-xl shadow-xs text-center select-none animate-fade-in font-sans">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800 mb-2">Select a Proposal</h3>
        <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Please select an active project proposal first from the <strong className="text-slate-700">Project proposals</strong> main menu tab to manage, import, or generate user stories.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      
      {/* 4 Ingestion tabs - Section A, B, C, D */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex bg-slate-50 border-b border-slate-200 text-xs">
          <button
            id="subtab-btn-manual"
            onClick={() => setActiveSubTab('manual')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'manual' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
          
          <button
            id="subtab-btn-upload"
            onClick={() => setActiveSubTab('upload')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'upload' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File (CSV/TXT)</span>
          </button>

          <button
            id="subtab-btn-jira"
            onClick={() => setActiveSubTab('jira')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'jira' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-[#0052CC]" />
            <span>Jira Connector (Proxy API)</span>
          </button>

          <button
            id="subtab-btn-azure"
            onClick={() => setActiveSubTab('azure')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold border-r border-slate-200 transition-colors cursor-pointer ${
              activeSubTab === 'azure' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4 text-[#0078D4]" />
            <span>Azure DevOps API</span>
          </button>

          <button
            id="subtab-btn-ai-generator"
            onClick={() => setActiveSubTab('ai-generator')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold transition-colors cursor-pointer ${
              activeSubTab === 'ai-generator' ? 'bg-white text-teal-600 border-t-2 border-t-teal-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="font-bold">AI Story Generator</span>
          </button>
        </div>

        <div className="p-6">
          {activeSubTab === 'manual' && (
            <form onSubmit={handleAddManualStory} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3.5">
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-1">Role/Actor</label>
                    <input
                      id="manual-story-role"
                      type="text"
                      disabled={isViewer}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Estimator"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 text-xs rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-1">Story Goal *</label>
                    <input
                      id="manual-story-goal"
                      type="text"
                      required
                      disabled={isViewer}
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="I want to edit functional complexity levels inline"
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-1">Story Benefit / Output</label>
                  <input
                    id="manual-story-benefit"
                    type="text"
                    disabled={isViewer}
                    value={benefit}
                    onChange={(e) => setBenefit(e.target.value)}
                    placeholder="so that I can override system estimations easily"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-4 border-l border-slate-200 pl-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-1">Epic Guild</label>
                    <input
                      id="manual-story-epic"
                      type="text"
                      disabled={isViewer}
                      value={epic}
                      onChange={(e) => setEpic(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2 text-xs rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-1">Priority</label>
                    <select
                      id="manual-story-priority"
                      disabled={isViewer}
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-1.5 px-1.5 text-xs rounded-lg focus:outline-none"
                    >
                      <option value="High">Red — High</option>
                      <option value="Medium">Amber — Med</option>
                      <option value="Low">Green — Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-1">Tags (separated by commas)</label>
                  <input
                    id="manual-story-tags"
                    type="text"
                    disabled={isViewer}
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="admin, calculations, interface"
                    className="w-full bg-slate-50 border border-slate-200 py-1.5 px-2.5 text-xs rounded-lg focus:outline-none"
                  />
                </div>

                {!isViewer && (
                  <button
                    id="manual-story-add-btn"
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Append Story</span>
                  </button>
                )}
              </div>
            </form>
          )}

          {activeSubTab === 'upload' && (
            <div className="border-2 border-dashed border-slate-350 rounded-xl p-8 bg-slate-50 text-center">
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="font-sans font-bold text-slate-700 text-xs mb-1">Drag and Drop Document Raw files (CSV, TXT)</h4>
              <p className="font-sans text-[11px] text-slate-400 max-w-sm mx-auto mb-4">Upload standard structured stories CSVs, or drop unstructured scope documents to break down narratives sequentially.</p>
              
              <div className="relative inline-block">
                <input
                  type="file"
                  id="story-uploader-input"
                  accept=".csv,.txt"
                  disabled={importLoading || isViewer}
                  onChange={handleBulkParserTrigger}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                />
                <button
                  id="upload-stories-btn"
                  type="button"
                  className="bg-white border border-slate-200 hover:border-slate-350 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs text-slate-700 cursor-pointer"
                >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Database className="w-4 h-4 inline mr-1 text-slate-500" />}
                  <span>Choose File Explorer</span>
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'jira' && (
            <div className="space-y-4 border border-slate-100 p-4 rounded-lg bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-slate-700">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold font-sans">Jira Portfolio Pipeline Connector</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Jira URL (Base Instance)</label>
                  <input
                    id="jira-url-input"
                    type="text"
                    disabled={isViewer}
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    className="w-full border border-slate-200 bg-white font-sans text-xs py-1.5 px-3 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Project Key (Filters JQL)</label>
                  <input
                    id="jira-key-input"
                    type="text"
                    disabled={isViewer}
                    value={jiraKey}
                    onChange={(e) => setJiraKey(e.target.value)}
                    className="w-full border border-slate-200 bg-white font-sans text-xs py-1.5 px-3 rounded"
                  />
                </div>
              </div>

              {!isViewer && (
                <div className="pt-2 text-right">
                  <button
                    id="jira-connect-btn"
                    onClick={handleJiraConnect}
                    disabled={integrationLoading}
                    className="bg-[#0052CC] hover:bg-[#0747A6] text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                  >
                    {integrationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    <span>Authenticate & Fetch Stories</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'azure' && (
            <div className="space-y-4 border border-slate-100 p-4 rounded-lg bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-slate-700">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold font-sans">Azure Boards work Item Integration</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Azure Organisation URL</label>
                  <input
                    id="azure-url-input"
                    type="text"
                    disabled={isViewer}
                    value={azureUrl}
                    onChange={(e) => setAzureUrl(e.target.value)}
                    className="w-full border border-slate-200 bg-white font-sans text-xs py-1.5 px-3 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block">Project Area Name</label>
                  <input
                    id="azure-project-input"
                    type="text"
                    disabled={isViewer}
                    value={azureProject}
                    onChange={(e) => setAzureProject(e.target.value)}
                    className="w-full border border-slate-200 bg-white font-sans text-xs py-1.5 px-3 rounded"
                  />
                </div>
              </div>

              {!isViewer && (
                <div className="pt-2 text-right">
                  <button
                    id="azure-connect-btn"
                    onClick={handleAzureConnect}
                    disabled={integrationLoading}
                    className="bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                  >
                    {integrationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    <span>Import Work Items</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'ai-generator' && (
            <div className="space-y-4 border border-slate-150 p-5 rounded-lg bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-purple-700">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                <span className="text-xs font-bold font-sans">Gemini AI Agile Backlog Builder</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed max-w-3xl">
                Paste your product scope documentation, raw feature requests, or technical requirement notes. 
                Our underlying <strong>Gemini 3.5-flash</strong> model will decompose them, identify logical actors, 
                draft narrative goals with benefits, structure their target epic blocks, and populate them to your estimation list instantly.
              </p>

              <form onSubmit={handleGenerateStoriesFromRequirements} className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1.5">
                    Unstructured Requirements Document / Notes
                  </label>
                  <textarea
                    id="ai-requirements-textarea"
                    disabled={generationLoading || isViewer}
                    value={requirementsText}
                    onChange={(e) => setRequirementsText(e.target.value)}
                    placeholder="Example: We need a ride sharing app. The passenger should be able to request a ride by choosing home and office locations..."
                    rows={6}
                    className="w-full bg-white border border-slate-200 p-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-sans leading-relaxed shadow-sm resize-y"
                  />
                </div>

                {/* PDF & Word Attachment component with drag and drop capabilities */}
                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Specification Attachments (.docx / .pdf only)</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Context is retained across documents</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition select-none">
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Attach Documents</span>
                      <input 
                        id="ai-attachment-file-input"
                        type="file" 
                        multiple 
                        accept=".pdf,.docx" 
                        onChange={handleFileAttach}
                        disabled={generationLoading || isViewer}
                        className="hidden" 
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Upload system requirements specifications. Word (.docx) & PDF documents are fully processed page-by-page.
                    </p>
                  </div>

                  {attachedFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 max-h-[140px] overflow-y-auto scroller">
                      {attachedFiles.map((file, fileIdx) => (
                        <div key={fileIdx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-lg text-xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                            <span className="font-semibold text-slate-700 truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDetachFile(fileIdx)}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                      Override Group Epic (Optional)
                    </label>
                    <input
                      id="ai-epic-override"
                      type="text"
                      disabled={generationLoading || isViewer}
                      value={defaultEpic}
                      onChange={(e) => setDefaultEpic(e.target.value)}
                      placeholder="General"
                      className="w-full border border-slate-200 bg-white font-sans text-xs py-1.5 px-3 rounded"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    {!isViewer && (
                      <button
                        id="ai-generate-stories-btn"
                        type="submit"
                        disabled={generationLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                      >
                        {generationLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Interpreting Requirements & Generating Backlog...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                            <span>Decompose to Agile User Stories</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {generationError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-start gap-2 animate-pulse mt-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Generation Failed</p>
                      <p className="text-[11px] leading-relaxed select-text">{generationError}</p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Analysis Progress banner (Prompt 4 rule details) */}
      {analysisProgress.isRunning && (
        <div id="bulk-progress-panel" className="bg-slate-900 text-white rounded-xl p-5 flex items-center justify-between border border-teal-500 shadow-xl overflow-hidden animate-fade-in">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
              <span>Bulk Gemini Model Analysis Stream Operating...</span>
              <span id="analysis-step-log" className="text-slate-400 ml-auto font-mono text-[10px]">{analysisProgress.current} / {analysisProgress.total} Classified</span>
            </div>
            {/* Staggered progress scale bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-2">
              <div 
                id="analysis-progress-bar"
                style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                className="bg-teal-500 h-full transition-all duration-300 rounded-full" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Ingestion count card metrics */}
      <div id="ingestion-metrics-strip" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-100 rounded-lg p-3 text-center shadow-xs">
          <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Total Ingested</span>
          <span id="stat-stories-total" className="text-xl font-extrabold text-slate-800 font-sans">{total}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-lg p-3 text-center shadow-xs">
          <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold text-slate-450">Pending AI</span>
          <span id="stat-stories-pending" className="text-xl font-extrabold text-slate-400 font-sans">{pending}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-lg p-3 text-center shadow-xs">
          <span className="text-[10px] font-mono text-emerald-600 block uppercase font-bold">Classified</span>
          <span id="stat-stories-classified" className="text-xl font-extrabold text-emerald-600 font-sans">{classified}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-lg p-3 text-center shadow-xs">
          <span className="text-[10px] font-mono text-indigo-500 block uppercase font-bold">Overridden</span>
          <span id="stat-stories-overridden" className="text-xl font-extrabold text-indigo-500 font-sans">{overridden}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-lg p-3 text-center shadow-xs">
          <span className="text-[10px] font-mono text-rose-500 block uppercase font-bold">Flags Issued</span>
          <span id="stat-stories-flagged" className="text-xl font-extrabold text-rose-500 font-sans">{flagged}</span>
        </div>
      </div>

      {/* Master Stories list (visible for CRUD operations always) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-slate-600" />
            <h3 className="font-sans font-extrabold text-sm text-slate-800 tracking-tight">Requirement Inventory Log</h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {total > 0 && !isViewer && (
              <button
                id="btn-stories-clear"
                onClick={handleClearAll}
                className="bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-600 hover:text-rose-600 text-xs py-1.5 px-3 rounded-lg transition"
              >
                Clear Scope
              </button>
            )}
            
            {total > 0 && (
              <button
                id="btn-stories-export-csv"
                onClick={handleCSVExport}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-350 text-slate-700 text-xs py-1.5 px-3 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            {pending > 0 && !isViewer && (
              <button
                id="btn-analyse-bulk-run"
                onClick={handleAnalyseAll}
                disabled={analysisProgress.isRunning}
                className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-4.5 rounded-lg transition shadow-md shadow-indigo-700/10 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                <span>Evaluate Scope ({pending})</span>
              </button>
            )}
          </div>
        </div>

        {total === 0 ? (
          <div className="p-16 text-center text-slate-400 font-sans select-none">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-600 text-sm mb-1">No Operational Stories Staged</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Input specifications manually or drop files to trigger estimation calculations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-slate-650">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200 text-left">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-28">Story Key</th>
                  <th className="py-2.5 px-3 w-24 text-left">Domain/Actor</th>
                  <th className="py-2.5 px-3 text-left">Objective Narrative Requirement</th>
                  <th className="py-2.5 px-3 w-24">Epic</th>
                  <th className="py-2.5 px-3 w-16 text-center">Value</th>
                  <th className="py-2.5 px-3 w-20 text-center">Source</th>
                  <th className="py-2.5 px-3 w-24 text-center">AI Orbit Status</th>
                  {!isViewer && <th className="py-2.5 px-4 w-28 text-center">Operations</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {currentProject.stories.map((story, index) => (
                  <tr key={story.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="py-3 px-3 w-28 font-semibold text-slate-900">{story.story_id}</td>
                    <td className="py-3 px-3 text-slate-700 truncate max-w-[90px]">{story.role}</td>
                    <td className="py-3 px-3 text-slate-600 text-xs">
                      <div className="font-sans">
                        I want to {story.goal}
                        {story.benefit && <span className="text-slate-400">, so that {story.benefit}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 w-24 truncate text-slate-500" title={story.epic}>{story.epic}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        story.priority === 'High' 
                          ? 'bg-rose-100 text-rose-800' 
                          : story.priority === 'Medium' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {story.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        story.source === 'jira' 
                          ? 'bg-blue-100 text-blue-800' 
                          : story.source === 'azure' 
                            ? 'bg-teal-100 text-teal-850' 
                            : story.source === 'file' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-slate-105 text-slate-700'
                      }`}>
                        {story.source}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {story.ai_status === 'pending' && (
                        <span className="inline-block text-[9px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Pending AI</span>
                      )}
                      {story.ai_status === 'analysing' && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          <span>Analysing</span>
                        </span>
                      )}
                      {story.ai_status === 'classified' && (
                        <span className="inline-block text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Classified</span>
                      )}
                      {story.ai_status === 'overridden' && (
                        <span className="inline-block text-[9px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Overridden</span>
                      )}
                      {story.ai_status === 'flagged' && (
                        <span className="inline-block text-[9px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">Flagged</span>
                      )}
                    </td>
                    {!isViewer && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`action-analyse-${story.id}`}
                            onClick={() => handleAnalyseStory(story.id)}
                            disabled={story.ai_status === 'analysing'}
                            title="Evaluate Story"
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1 px-1.5 rounded transition flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <Play className="w-2.5 h-2.5 text-indigo-550" />
                            <span>Run</span>
                          </button>
                          
                          <button
                            id={`action-elaborate-${story.id}`}
                            onClick={() => handleElaborateStory(story)}
                            title="AI Elaborate"
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-1 px-1.5 rounded transition flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <ScrollText className="w-2.5 h-2.5 text-purple-550" />
                            <span>Elaborate</span>
                          </button>

                          <button
                            id={`action-split-${story.id}`}
                            onClick={() => handleSplitStory(story)}
                            title="AI Split Story"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1 px-1.5 rounded transition flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <Scissors className="w-2.5 h-2.5 text-emerald-555" />
                            <span>Split</span>
                          </button>

                          <button
                            id={`action-edit-${story.id}`}
                            onClick={() => handleEditOpen(story)}
                            title="Edit details"
                            className="text-slate-400 hover:text-slate-700 p-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`action-delete-${story.id}`}
                            onClick={() => deleteUserStory(story.id)}
                            title="Delete"
                            className="text-slate-450 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Edit Modal */}
      {isEditModalOpen && editingStory && (
        <div id="story-edit-modal-bg" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden m-4 border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center w-full">
              <span className="font-bold text-xs font-mono uppercase text-slate-500">Edit Story: {editingStory.story_id}</span>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-650">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-mono uppercase block text-slate-450 font-bold mb-1">Actor</label>
                  <input
                    id="edit-story-role"
                    type="text"
                    defaultValue={editingStory.role}
                    onChange={(e) => editingStory.role = e.target.value}
                    className="w-full border border-slate-200 bg-slate-50 p-1.5 rounded"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-mono uppercase block text-slate-450 font-bold mb-1">Goal</label>
                  <input
                    id="edit-story-goal"
                    type="text"
                    defaultValue={editingStory.goal}
                    onChange={(e) => editingStory.goal = e.target.value}
                    className="w-full border border-slate-200 bg-slate-50 p-1.5 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase block text-slate-450 font-bold mb-1">Benefit</label>
                <input
                  id="edit-story-benefit"
                  type="text"
                  defaultValue={editingStory.benefit}
                  onChange={(e) => editingStory.benefit = e.target.value}
                  className="w-full border border-slate-200 bg-slate-50 p-1.5 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono uppercase block text-slate-450 font-bold mb-1">Epic</label>
                  <input
                    id="edit-story-epic"
                    type="text"
                    defaultValue={editingStory.epic}
                    onChange={(e) => editingStory.epic = e.target.value}
                    className="w-full border border-slate-200 bg-slate-50 p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase block text-slate-450 font-bold mb-1">Priority</label>
                  <select
                    id="edit-story-priority"
                    defaultValue={editingStory.priority}
                    onChange={(e: any) => editingStory.priority = e.target.value}
                    className="w-full border border-slate-200 bg-slate-50 p-1.5 rounded"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 text-right">
                <button
                  id="edit-story-submit-btn"
                  onClick={() => handleEditSave({
                    role: editingStory.role,
                    goal: editingStory.goal,
                    benefit: editingStory.benefit,
                    epic: editingStory.epic,
                    priority: editingStory.priority
                  })}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow cursor-pointer ml-auto"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Elaboration Modal */}
      {isElaborateModalOpen && activeElaborateStory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl w-full mx-4 shadow-2xl flex flex-col max-h-[85vh] text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-slate-800">
                    AI Backlog Elaboration: {activeElaborateStory.story_id}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    As a {activeElaborateStory.role}, I want to {activeElaborateStory.goal}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsElaborateModalOpen(false)}
                className="text-slate-405 hover:text-slate-650 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 mb-4 bg-slate-50 border border-slate-150 rounded-lg p-5">
              {isElaborating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600 animate-pulse">
                    Gemini 3.5-flash is detailing Acceptance Criteria & Tech notes...
                  </p>
                </div>
              ) : elaboratedText ? (
                <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed text-xs">
                  <ReactMarkdown>{elaboratedText}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium mb-4">No elaboration exists yet for this requirement.</p>
                  <button
                    onClick={() => runElaborationWithAI(activeElaborateStory.id)}
                    className="bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer"
                  >
                    Generate Elaboration Spec
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[10px] text-slate-400 font-mono">
                Powered by Gemini Pro
              </span>
              <div className="flex gap-2">
                {elaboratedText && !isElaborating && (
                  <button
                    onClick={() => runElaborationWithAI(activeElaborateStory.id)}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-705 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition border border-purple-150"
                  >
                    Re-generate
                  </button>
                )}
                <button
                  onClick={() => setIsElaborateModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-150 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Story Splitting Modal */}
      {isSplitModalOpen && splittingParentStory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl w-full mx-4 shadow-2xl flex flex-col max-h-[85vh] text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-slate-800">
                    Agile Product Backlog Splitter: {splittingParentStory.story_id}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Decompose compound requirements into individual, high-fidelity sub-stories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="text-slate-405 hover:text-slate-650 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 bg-slate-50 border border-slate-150 rounded-lg p-3">
              <span className="text-[10px] font-mono font-bold uppercase block text-slate-450 mb-1">Parent Contract / Story</span>
              <p className="text-xs font-semibold text-slate-705">
                As a {splittingParentStory.role}, I want to {splittingParentStory.goal}, so that {splittingParentStory.benefit}.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 mb-4 min-h-[180px]">
              {isSplitAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600 animate-pulse">
                    Gemini 3.5-flash is decomposing interfaces, entities, steps and channels...
                  </p>
                </div>
              ) : proposedSplits.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-slate-700 font-extrabold text-xs mb-1">Proposed Independent Sub-Stories ({proposedSplits.length}):</p>
                  {proposedSplits.map((p, i) => (
                    <div key={i} className="border border-slate-200 hover:border-slate-300 p-3 bg-slate-50/40 rounded-lg relative transition">
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                          p.priority === 'High' 
                            ? 'bg-rose-50 text-rose-700 border-rose-150' 
                            : p.priority === 'Medium' 
                              ? 'bg-amber-50 text-amber-700 border-amber-150' 
                              : 'bg-slate-50 text-slate-600 border-slate-150'
                        }`}>
                          {p.priority}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500">
                          {p.module || splittingParentStory.module}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono font-bold text-[9px] block">
                        Sub-Story {splittingParentStory.story_id}-{String.fromCharCode(65 + i)} (Role: {p.role})
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed mt-1 font-semibold">
                        <strong>Goal:</strong> I want to {p.goal}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                        <strong>Benefit:</strong> so that {p.benefit}
                      </p>
                    </div>
                  ))}

                  {/* Configuration parameters for importing */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                      <span className="text-[10px] font-mono block text-slate-450 font-bold mb-1">SPLIT IMPORT STRATEGY</span>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-750">
                          <input
                            type="radio"
                            checked={splitAction === 'replace'}
                            onChange={() => setSplitAction('replace')}
                            className="accent-emerald-600"
                          />
                          Replace Parent Story (Recommended)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-755">
                          <input
                            type="radio"
                            checked={splitAction === 'keep'}
                            onChange={() => setSplitAction('keep')}
                            className="accent-emerald-600"
                          />
                          Keep Parent Story
                        </label>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-450 flex items-center p-2 leading-relaxed">
                      {splitAction === 'replace' 
                        ? `This will import the split stories with serial letters (e.g. ${splittingParentStory.story_id}-A, B, C) and cleanly remove parent ${splittingParentStory.story_id} to keep your estimates accurate.` 
                        : `This will keep parent ${splittingParentStory.story_id} intact and add the new split sub-stories as extra backlog items.`
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-450">
                  <Sparkles className="w-10 h-10 text-emerald-500/80 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700 mb-1">Decompose complex or multi-interface actions via AI</p>
                  <p className="text-[11px] text-slate-400 mb-4 max-w-sm mx-auto">Agile rules-of-thumb specify splitting user stories that reference multiple external payment gateways (credit card, Apple Pay, PayPal), channels, or separate logical user steps.</p>
                  <button
                    onClick={() => runSplittingAnalysis(splittingParentStory.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-sm cursor-pointer transition"
                  >
                    Analyze Split Strategy
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[10px] text-slate-400 font-mono">
                Powered by Gemini Pro
              </span>
              <div className="flex gap-2">
                {proposedSplits.length > 0 && !isSplitApplying && (
                  <button
                    onClick={() => runSplittingAnalysis(splittingParentStory.id)}
                    className="bg-slate-100 hover:bg-slate-150 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition border border-slate-150"
                  >
                    Re-analyze
                  </button>
                )}
                <button
                  onClick={() => setIsSplitModalOpen(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                {proposedSplits.length > 0 && (
                  <button
                    onClick={applySplitsConfirm}
                    disabled={isSplitApplying}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-lg cursor-pointer flex items-center gap-1.5"
                  >
                    {isSplitApplying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying splits...</span>
                      </>
                    ) : (
                      <span>Apply Split & Ingest ({proposedSplits.length})</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
