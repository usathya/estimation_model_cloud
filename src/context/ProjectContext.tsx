import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, UserStory, AiClassification, AiOverride, CosmicMovement, HybridCriterion, HybridScore, Overhead, FpaGscRating, CostConfig } from '../types.js';

interface ProjectScopeData {
  project: Project | null;
  stories: UserStory[];
  classifications: AiClassification[];
  overrides: AiOverride[];
  movements: CosmicMovement[];
  criteria: HybridCriterion[];
  scores: HybridScore[];
  overheads: Overhead[];
  ratings: FpaGscRating[];
  costConfig: CostConfig | null;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: ProjectScopeData;
  isLoadingProjects: boolean;
  isLoadingProjectDetail: boolean;
  refreshProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  saveProject: (updatedDetails: Partial<Project>) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<boolean>;
  createProject: (name: string, client?: string, version?: string, currency?: string, team_size?: number) => Promise<any | null>;
  setProjectScope: React.Dispatch<React.SetStateAction<ProjectScopeData>>;
  saveCostConfig: (config: CostConfig) => Promise<void>;
  saveOverhead: (overhead: Overhead) => Promise<void>;
  deleteOverhead: (id: string) => Promise<void>;
  saveGscRating: (gscNumber: number, rating: number) => Promise<void>;
  saveCriterion: (crit: HybridCriterion) => Promise<void>;
  deleteCriterion: (id: string) => Promise<void>;
  saveHybridScore: (score: HybridScore) => Promise<void>;
  deleteUserStory: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const emptyScope: ProjectScopeData = {
  project: null,
  stories: [],
  classifications: [],
  overrides: [],
  movements: [],
  criteria: [],
  scores: [],
  overheads: [],
  ratings: [],
  costConfig: null
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectScopeData>(emptyScope);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingProjectDetail, setIsLoadingProjectDetail] = useState(false);

  const fetchProjectList = async () => {
    try {
      setIsLoadingProjects(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching project list:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchProjectList();
      const savedId = localStorage.getItem('selected_project_id');
      if (savedId) {
        // Fetch details of the saved project ID
        try {
          const detailRes = await fetch(`/api/projects/${savedId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setCurrentProject({
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
          } else {
            localStorage.removeItem('selected_project_id');
          }
        } catch (e) {
          console.error('Failed to pre-load saved project', e);
        }
      }
    };
    init();
  }, []);

  const refreshProjects = async () => {
    await fetchProjectList();
  };

  const loadProject = async (id: string) => {
    try {
      setIsLoadingProjectDetail(true);
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentProject({
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
        localStorage.setItem('selected_project_id', id);
      }
    } catch (err) {
      console.error(`Error loading project detail for ${id}:`, err);
    } finally {
      setIsLoadingProjectDetail(false);
    }
  };

  const createProject = async (name: string, client = 'General', version = '1.0', currency = 'SAR', team_size = 5) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, client, version, currency, team_size })
      });
      if (res.ok) {
        const newProj = await res.json();
        localStorage.setItem('selected_project_id', newProj.id);
        await loadProject(newProj.id);
        await fetchProjectList();
        return newProj;
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
    return null;
  };

  const saveProject = async (updatedDetails: Partial<Project>) => {
    if (!currentProject.project) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDetails)
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(prev => ({
          ...prev,
          project: data
        }));
        await fetchProjectList();
      }
    } catch (err) {
      console.error('Error saving project details:', err);
    }
  };

  const duplicateProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchProjectList();
      }
    } catch (err) {
      console.error('Error duplicating project:', err);
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (currentProject.project?.id === id) {
          setCurrentProject(emptyScope);
          localStorage.removeItem('selected_project_id');
        }
        await fetchProjectList();
        return true;
      } else {
        const body = await res.json();
        alert(body.error || 'Failed to delete project');
        return false;
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      return false;
    }
  };

  const saveCostConfig = async (config: CostConfig) => {
    try {
      const res = await fetch('/api/cost_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setCurrentProject(prev => ({
            ...prev,
            costConfig: data
          }));
        } else {
          console.error('Cost config save returned empty response');
          alert('Failed to save cost settings: empty response from server. Check console for details.');
        }
      } else {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        console.error('Cost config save failed:', res.status, errData);
        alert(`Failed to save cost settings: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error saving cost config:', err);
      alert('Failed to save cost settings. See console for details.');
    }
  };

  const saveOverhead = async (overhead: Overhead) => {
    try {
      const isUpdate = !!overhead.id;
      const url = isUpdate ? `/api/overheads/${overhead.id}` : '/api/overheads';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overhead)
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(prev => {
          const idx = prev.overheads.findIndex(o => o.id === data.id);
          const newOhs = [...prev.overheads];
          if (idx !== -1) newOhs[idx] = data;
          else newOhs.push(data);
          return { ...prev, overheads: newOhs };
        });
      }
    } catch (err) {
      console.error('Error saving overhead:', err);
    }
  };

  const deleteOverhead = async (id: string) => {
    try {
      const res = await fetch(`/api/overheads/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCurrentProject(prev => ({
          ...prev,
          overheads: prev.overheads.filter(o => o.id !== id)
        }));
      }
    } catch (err) {
      console.error('Error deleting overhead:', err);
    }
  };

  const saveGscRating = async (gscNumber: number, rating: number) => {
    if (!currentProject.project) return;
    try {
      const res = await fetch('/api/fpa_gsc_ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: currentProject.project.id,
          gsc_number: gscNumber,
          rating
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(prev => {
          const idx = prev.ratings.findIndex(r => r.gsc_number === gscNumber);
          const newRatings = [...prev.ratings];
          if (idx !== -1) newRatings[idx] = data;
          else newRatings.push(data);
          return { ...prev, ratings: newRatings };
        });
      }
    } catch (err) {
      console.error('Error saving FPA GSC rating:', err);
    }
  };

  const saveCriterion = async (crit: HybridCriterion) => {
    try {
      const isUpdate = !!crit.id;
      const url = isUpdate ? `/api/hybrid_criteria/${crit.id}` : '/api/hybrid_criteria';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crit)
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(prev => {
          const idx = prev.criteria.findIndex(c => c.id === data.id);
          const newC = [...prev.criteria];
          if (idx !== -1) newC[idx] = data;
          else newC.push(data);
          return { ...prev, criteria: newC };
        });
      }
    } catch (err) {
      console.error('Error saving criterion:', err);
    }
  };

  const deleteCriterion = async (id: string) => {
    try {
      const res = await fetch(`/api/hybrid_criteria/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCurrentProject(prev => ({
          ...prev,
          criteria: prev.criteria.filter(c => c.id !== id),
          scores: prev.scores.filter(s => s.criterion_id !== id)
        }));
      }
    } catch (err) {
      console.error('Error deleting hybrid criterion:', err);
    }
  };

  const saveHybridScore = async (score: HybridScore) => {
    try {
      const res = await fetch('/api/hybrid_scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score)
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(prev => {
          const idx = prev.scores.findIndex(s => s.story_id === data.story_id && s.criterion_id === data.criterion_id);
          const newS = [...prev.scores];
          if (idx !== -1) newS[idx] = data;
          else newS.push(data);
          return { ...prev, scores: newS };
        });
      }
    } catch (err) {
      console.error('Error saving hybrid score:', err);
    }
  };

  const deleteUserStory = async (id: string) => {
    try {
      const res = await fetch(`/api/stories/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCurrentProject(prev => ({
          ...prev,
          stories: prev.stories.filter(s => s.id !== id),
          classifications: prev.classifications.filter(c => c.story_id !== id),
          movements: prev.movements.filter(m => m.story_id !== id),
          scores: prev.scores.filter(s => s.story_id !== id)
        }));
      }
    } catch (err) {
      console.error('Error deleting user story:', err);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        isLoadingProjects,
        isLoadingProjectDetail,
        refreshProjects,
        loadProject,
        saveProject,
        duplicateProject,
        deleteProject,
        createProject,
        setProjectScope: setCurrentProject,
        saveCostConfig,
        saveOverhead,
        deleteOverhead,
        saveGscRating,
        saveCriterion,
        deleteCriterion,
        saveHybridScore,
        deleteUserStory
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
