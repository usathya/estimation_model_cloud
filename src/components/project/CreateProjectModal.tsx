import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext.js';
import { X, PlusCircle, Sparkles, Loader2, DollarSign } from 'lucide-react';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const { createProject } = useProject();
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [projectType, setProjectType] = useState('Web App');
  const [currency, setCurrency] = useState('SAR');
  const [teamSize, setTeamSize] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Proposal name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const success = await createProject(
        name,
        client || 'General Client',
        version || '1.0',
        currency || 'SAR',
        Number(teamSize) || 5
      );

      if (success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg('Failed to create new proposal. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="create-modal-bg" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden m-4 font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-sans font-extrabold text-sm text-slate-850 leading-none">Create Project Proposal</h3>
              <p className="font-sans text-[11px] text-slate-400">Initialize a new multi-model estimation schema.</p>
            </div>
          </div>
          <button
            id="create-modal-close-btn"
            type="button"
            onClick={onClose}
            className="text-slate-450 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 p-2.5 rounded-lg text-[11px]">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-slate-450 block">Proposal name *</label>
            <input
              id="new-proposal-name"
              type="text"
              required
              placeholder="e.g. Government Portal Revamp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-450 block">Client name</label>
              <input
                id="new-proposal-client"
                type="text"
                placeholder="e.g. Ministry of ICT"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-450 block">Version Code</label>
              <input
                id="new-proposal-version"
                type="text"
                placeholder="e.g. 1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-450 block">Currency code</label>
              <select
                id="new-proposal-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="SAR">SAR (Saudi Riyal)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-450 block">Initial Team Size Pool</label>
              <input
                id="new-proposal-teamsize"
                type="number"
                min="1"
                placeholder="5"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-slate-450 block">Platform Engineering Category</label>
            <select
              id="new-proposal-type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none text-slate-800 text-xs focus:ring-1 focus:ring-teal-500"
            >
              <option value="Web App">Web application (Cloud-native)</option>
              <option value="Mobile App">Mobile application (Android/iOS)</option>
              <option value="Microservice API">API Backend & Microservices</option>
              <option value="Custom Hardware/Embedded">Custom Hardware & IoT</option>
              <option value="Core Database/Data Lake">Database / Data Lake migration</option>
            </select>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 mt-2">
            <button
              id="create-modal-cancel-btn"
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="create-modal-submit-btn"
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-350 text-white font-semibold py-2 px-5 rounded shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Create Proposal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
