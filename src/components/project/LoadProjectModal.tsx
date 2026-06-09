import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Project } from '../../types.js';
import {
  X,
  FolderOpen,
  Trash2,
  Copy,
  Plus,
  Loader2
} from 'lucide-react';

interface LoadProjectModalProps {
  onClose: () => void;
  onNewProjectOpen: () => void;
}

export default function LoadProjectModal({ onClose, onNewProjectOpen }: LoadProjectModalProps) {
  const { projects, refreshProjects, loadProject, duplicateProject, deleteProject } = useProject();
  const { isAdmin } = useAuth();
  const [loadingPrj, setLoadingPrj] = useState<string | null>(null);

  useEffect(() => {
    refreshProjects();
  }, []);

  const handleLoad = async (id: string) => {
    setLoadingPrj(id);
    await loadProject(id);
    setLoadingPrj(null);
    onClose();
  };

  const handleDuplicate = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to duplicate "${name}"?`)) {
      await duplicateProject(id);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to permanently delete "${name}"? This operation cannot be undone.`)) {
      await deleteProject(id);
    }
  };

  return (
    <div id="load-modal-bg" className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden m-4">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-5 w-full flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-sans font-extrabold text-sm text-slate-850 leading-none">Global Project Directories</h3>
              <p className="font-sans text-[11px] text-slate-400">Load historic project records or trigger duplicates.</p>
            </div>
          </div>
          <button
            id="load-modal-close-btn"
            onClick={onClose}
            className="text-slate-450 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Directory Content List */}
        <div className="flex-1 p-6 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-xs font-sans">No projects stored in datastore yet.</p>
              <button
                onClick={() => {
                  onClose();
                  onNewProjectOpen();
                }}
                className="mt-4 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs py-2 px-4 rounded border border-teal-200 transition"
              >
                Create First Proposal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-650">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] uppercase font-mono tracking-wider">
                    <th className="py-2.5 px-3 text-left">Project Name</th>
                    <th className="py-2.5 px-3 text-left">Client</th>
                    <th className="py-2.5 px-3 text-left">Type</th>
                    <th className="py-2.5 px-3 text-left">Status</th>
                    <th className="py-2.5 px-3 text-left">Estimator</th>
                    <th className="py-2.5 px-3 text-left">Updated</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {projects.map((proj) => (
                    <tr key={proj.id} id={`project-row-${proj.id}`} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="py-3 px-3 font-semibold text-slate-900 truncate max-w-[180px]">{proj.name}</td>
                      <td className="py-3 px-3 font-medium text-slate-600 truncate max-w-[120px]">{proj.client || 'General'}</td>
                      <td className="py-3 px-3 text-slate-500">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded">
                          {proj.project_type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${proj.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : proj.status === 'Under Review'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                          {proj.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 truncate max-w-[100px]">{proj.estimator_name || 'Umesh S.'}</td>
                      <td className="py-3 px-3 text-slate-400 text-[10px]">
                        {new Date(proj.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`load-btn-${proj.id}`}
                            onClick={() => handleLoad(proj.id)}
                            disabled={loadingPrj === proj.id}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[10px] px-2.5 py-1.5 rounded transition flex items-center gap-1"
                          >
                            {loadingPrj === proj.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FolderOpen className="w-3 h-3" />
                            )}
                            <span>Open</span>
                          </button>

                          <button
                            id={`dup-btn-${proj.id}`}
                            onClick={() => handleDuplicate(proj.id, proj.name)}
                            title="Duplicate Project Scope"
                            className="text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-350 p-1.5 rounded transition bg-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {isAdmin && (
                            <button
                              id={`del-btn-${proj.id}`}
                              onClick={() => handleDelete(proj.id, proj.name)}
                              title="Delete Project Records"
                              className="text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 p-1.5 rounded transition bg-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-[10px] font-mono text-slate-400">Directory contains {projects.length} proposal indexes.</span>
          <button
            onClick={() => {
              onClose();
              onNewProjectOpen();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Proposal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
